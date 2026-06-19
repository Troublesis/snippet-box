"""FastMCP server + front-door reverse proxy for a Snippet Box instance.

This process is the single entrypoint on the published host port. It:
  * serves the MCP (streamable HTTP) at MCP_PATH (default /mcp), and
  * transparently forwards every other request to the Snippet Box container
    (its web UI + REST API), which is internal-only on the compose network.

So one port answers both `…/` (Snippet Box UI/API) and `…/mcp` (MCP tools).
The MCP tools themselves drive Snippet Box through its REST API (no auth).

Configuration (env, see ../1panel.env):
  SNIPPET_BOX_URL      Snippet Box base URL   (default http://snippet-box:5000)
  SNIPPET_BOX_TIMEOUT  request timeout (sec)  (default 15)
  MCP_PATH             MCP mount path         (default /mcp)
  FASTMCP_HOST         bind address           (default 0.0.0.0)
  FASTMCP_PORT         bind port              (default 8000)
"""

import os
from contextlib import asynccontextmanager

import httpx
import uvicorn
from fastmcp import FastMCP
from fastmcp.exceptions import ToolError
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import RedirectResponse, Response
from starlette.routing import Mount, Route

SNIPPET_BOX_URL = os.environ.get("SNIPPET_BOX_URL", "http://snippet-box:5000").rstrip("/")
API = f"{SNIPPET_BOX_URL}/api/snippets"
REQUEST_TIMEOUT = float(os.environ.get("SNIPPET_BOX_TIMEOUT", "15"))
MCP_PATH = "/" + os.environ.get("MCP_PATH", "/mcp").strip("/")

mcp = FastMCP(
    name="snippet-box",
    instructions=(
        "Tools for managing snippets in a self-hosted Snippet Box instance. "
        "A snippet has: id (int), title, code, language, description, docs, "
        "isPinned (0/1) and tags (list of strings). The snippet's `language` "
        "is always added to its tags automatically. Use `search_snippets` to "
        "find snippets, `get_snippet` for full detail, and `get_snippet_raw` "
        "for just the code body."
    ),
)


# --------------------------------------------------------------------------- #
# Snippet Box REST API helpers (used by the MCP tools)
# --------------------------------------------------------------------------- #
async def _request(method: str, url: str, *, json: dict | None = None) -> httpx.Response:
    """Call the Snippet Box API and surface clean errors as ToolError."""
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.request(method, url, json=json)
    except httpx.RequestError as exc:
        raise ToolError(
            f"Could not reach Snippet Box at {SNIPPET_BOX_URL}: {exc}"
        ) from exc

    if response.is_error:
        detail = response.text
        try:
            detail = response.json().get("error", detail)
        except ValueError:
            pass
        raise ToolError(f"Snippet Box API error {response.status_code}: {detail}")

    return response


def _flatten_tags(snippet: dict) -> dict:
    """Normalize tags to a flat list of strings (search returns [{name}])."""
    tags = snippet.get("tags") or []
    return {
        **snippet,
        "tags": [t["name"] if isinstance(t, dict) else t for t in tags],
    }


# --------------------------------------------------------------------------- #
# MCP tools — full CRUD over snippets
# --------------------------------------------------------------------------- #
@mcp.tool
async def list_snippets() -> list[dict]:
    """List every snippet as a full object (including code and tags)."""
    response = await _request("GET", API)
    return response.json()["data"]


@mcp.tool
async def get_snippet(snippet_id: int) -> dict:
    """Get a single snippet by its numeric id."""
    response = await _request("GET", f"{API}/{snippet_id}")
    return response.json()["data"]


@mcp.tool
async def get_snippet_raw(snippet_id: int) -> str:
    """Get only the raw code body of a snippet, as plain text."""
    response = await _request("GET", f"{API}/raw/{snippet_id}")
    return response.text


@mcp.tool
async def create_snippet(
    title: str,
    code: str,
    language: str,
    description: str = "",
    docs: str = "",
    is_pinned: bool = False,
    tags: list[str] | None = None,
) -> dict:
    """Create a new snippet.

    `language` is required and is also stored as a tag automatically. `tags`
    are extra labels; they are lowercased and de-duplicated by Snippet Box.
    Returns the created snippet (with its new id).
    """
    payload = {
        "title": title,
        "code": code,
        "language": language,
        "description": description,
        "docs": docs,
        "isPinned": is_pinned,
        "tags": tags or [],
    }
    response = await _request("POST", API, json=payload)
    return response.json()["data"]


@mcp.tool
async def update_snippet(
    snippet_id: int,
    title: str | None = None,
    code: str | None = None,
    language: str | None = None,
    description: str | None = None,
    docs: str | None = None,
    is_pinned: bool | None = None,
    tags: list[str] | None = None,
) -> dict:
    """Update an existing snippet (partial update).

    Only the fields you pass are changed; every other field is preserved by
    fetching the current snippet first and merging. NOTE: passing `tags`
    REPLACES the whole tag list (the `language` tag is re-added automatically).
    Returns the updated snippet.
    """
    current = (await _request("GET", f"{API}/{snippet_id}")).json()["data"]

    payload = {
        "title": title if title is not None else current["title"],
        "code": code if code is not None else current["code"],
        "language": language if language is not None else current["language"],
        "description": description
        if description is not None
        else current.get("description", ""),
        "docs": docs if docs is not None else current.get("docs", ""),
        "isPinned": is_pinned
        if is_pinned is not None
        else bool(current.get("isPinned", 0)),
        "tags": tags if tags is not None else (current.get("tags") or []),
    }
    response = await _request("PUT", f"{API}/{snippet_id}", json=payload)
    return response.json()["data"]


@mcp.tool
async def delete_snippet(snippet_id: int) -> str:
    """Permanently delete a snippet by id."""
    await _request("DELETE", f"{API}/{snippet_id}")
    return f"Snippet {snippet_id} deleted."


@mcp.tool
async def search_snippets(
    query: str = "",
    tags: list[str] | None = None,
    languages: list[str] | None = None,
) -> list[dict]:
    """Search snippets.

    `query` matches as a substring of title or description (case-insensitive).
    `tags` and `languages` filter by exact (case-insensitive) match. With all
    three empty, Snippet Box returns an empty list.
    """
    payload = {
        "query": query,
        "tags": tags or [],
        "languages": languages or [],
    }
    response = await _request("POST", f"{API}/search", json=payload)
    return [_flatten_tags(snippet) for snippet in response.json()["data"]]


@mcp.tool
async def list_tags() -> list[dict]:
    """List all tags with the number of snippets using each: [{name, count}]."""
    response = await _request("GET", f"{API}/statistics/count")
    return response.json()["data"]


# --------------------------------------------------------------------------- #
# Front-door reverse proxy: forward every non-/mcp request to Snippet Box.
# --------------------------------------------------------------------------- #
_HOP_BY_HOP = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade",
}
# Strip these from upstream responses: httpx already decoded the body, so the
# original encoding/length headers would be wrong — let Starlette recompute.
_RESPONSE_STRIP = _HOP_BY_HOP | {"content-encoding", "content-length"}

_proxy_client = httpx.AsyncClient(base_url=SNIPPET_BOX_URL, timeout=REQUEST_TIMEOUT)


async def _proxy_to_snippet_box(request: Request) -> Response:
    """Transparently forward a request to the internal Snippet Box container."""
    target = request.url.path
    if request.url.query:
        target = f"{target}?{request.url.query}"

    headers = [
        (name, value)
        for name, value in request.headers.items()
        if name.lower() not in _HOP_BY_HOP and name.lower() != "host"
    ]
    body = await request.body()

    try:
        upstream = await _proxy_client.request(
            request.method, target, headers=headers, content=body
        )
    except httpx.RequestError as exc:
        return Response(f"Snippet Box is unreachable: {exc}", status_code=502)

    response_headers = {
        name: value
        for name, value in upstream.headers.items()
        if name.lower() not in _RESPONSE_STRIP
    }
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=response_headers,
    )


# --------------------------------------------------------------------------- #
# App assembly: MCP at MCP_PATH, proxy catch-all for everything else.
# --------------------------------------------------------------------------- #
_mcp_app = mcp.http_app(path="/")


async def _redirect_bare_mcp(request: Request) -> RedirectResponse:
    """Send a bare `/mcp` (no trailing slash) to the mounted MCP app at `/mcp/`.

    Starlette's `Mount` only matches the mount path *with* a trailing slash (or
    a sub-path), so a bare `/mcp` would otherwise fall through to the proxy and
    hit Snippet Box (404). MCP clients commonly use the slash-less URL, so we
    307-redirect here — 307 preserves the request method and body of MCP POSTs.
    """
    target = MCP_PATH + "/"
    if request.url.query:
        target = f"{target}?{request.url.query}"
    return RedirectResponse(target, status_code=307)


@asynccontextmanager
async def _lifespan(app: Starlette):
    # Run the MCP session-manager lifespan (required), then clean up the proxy.
    async with _mcp_app.lifespan(app):
        yield
    await _proxy_client.aclose()


app = Starlette(
    routes=[
        Mount(MCP_PATH, app=_mcp_app),
        # Bare `/mcp` (no trailing slash) -> `/mcp/` so slash-less client URLs work.
        Route(
            MCP_PATH,
            _redirect_bare_mcp,
            methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
        ),
        Route(
            "/{path:path}",
            _proxy_to_snippet_box,
            methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
        ),
    ],
    lifespan=_lifespan,
)


if __name__ == "__main__":
    uvicorn.run(
        app,
        host=os.environ.get("FASTMCP_HOST", "0.0.0.0"),
        port=int(os.environ.get("FASTMCP_PORT", "8000")),
    )
