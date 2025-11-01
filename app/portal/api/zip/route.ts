// app/portal/api/zip/route.ts
import { NextRequest } from 'next/server';
// @ts-ignore: no types for 'archiver'
import archiver from 'archiver';

export const runtime = 'nodejs';

type FileSpec = { url: string; name: string };

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const zipName = sanitizeName(searchParams.get('name') || 'demo-bags');

    const { files } = (await req.json()) as { files: FileSpec[] };
    if (!Array.isArray(files) || files.length === 0) {
      return new Response('No files', { status: 400 });
    }

    const { readable, writable } = new TransformStream();

    // @ts-ignore – archiver expects a Node stream
    const archive = archiver('zip', { zlib: { level: 9 } });

    const writer = writable.getWriter();
    const bridge = new WritableStream({
      write(chunk) { return writer.write(chunk); },
      close() { return writer.close(); },
      abort(reason) { writer.abort(reason); },
    });

    // @ts-ignore
    archive.pipe(bridge as any);

    (async () => {
      for (const f of files) {
        const res = await fetch(f.url);
        if (!res.ok || !res.body) continue;
        // @ts-ignore
        archive.append((res as any).body, { name: safeName(f.name) });
      }
      archive.finalize();
    })().catch((e) => {
      // eslint-disable-next-line no-console
      console.error('zip error', e);
      archive.abort();
    });

    return new Response(readable as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}.zip"`,
      },
    });
  } catch (e) {
    console.error(e);
    return new Response('Zip failed', { status: 500 });
  }
}

function safeName(name: string) {
  return name.replace(/[/\\?%*:|"<>]/g, '_');
}

function sanitizeName(name: string) {
  return name
    .replace(/[/\\?%*:|"<> ]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 100);
}