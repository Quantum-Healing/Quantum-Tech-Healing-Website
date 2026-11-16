// Video range handler for the existing Cloudflare Worker. Static pages bypass it.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/videos/') || !url.pathname.endsWith('.mp4') ||
        !['GET', 'HEAD'].includes(request.method)) {
      return env.ASSETS.fetch(request);
    }

    const response = await env.ASSETS.fetch(request);
    // Preserve native range handling if the asset service already supports it.
    if (response.status !== 200) return response;

    const headers = new Headers(response.headers);
    headers.set('Accept-Ranges', 'bytes');
    const fullResponse = () => new Response(response.body, { status: 200, headers });
    const range = request.headers.get('Range');
    if (request.method === 'HEAD' || !range) return fullResponse();

    // Ignore malformed or multipart ranges, returning the complete representation.
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match || (!match[1] && !match[2])) return fullResponse();

    const ifRange = request.headers.get('If-Range');
    if (ifRange) {
      const modified = headers.get('Last-Modified');
      const matches = ifRange.startsWith('"')
        ? ifRange === headers.get('ETag')
        : modified && Number.isFinite(Date.parse(ifRange)) &&
          Date.parse(modified) <= Date.parse(ifRange);
      if (!matches) return fullResponse();
    }

    // The static asset service can ignore Range requests. Published videos are
    // below 25 MiB, so slicing fits the Worker memory allowance.
    const buffer = await response.arrayBuffer();
    const size = buffer.byteLength;
    const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
        start >= size || end < start || (!match[1] && Number(match[2]) === 0)) {
      headers.set('Content-Range', `bytes */${size}`);
      headers.set('Content-Length', '0');
      return new Response(null, { status: 416, headers });
    }

    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    headers.set('Content-Length', String(end - start + 1));
    return new Response(buffer.slice(start, end + 1), { status: 206, headers });
  }
};
