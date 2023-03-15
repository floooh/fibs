import * as util from './util.ts';

const FILE_SERVER_URL = 'https://deno.land/std@0.178.0/http/file_server.ts';

export type ServeOptions = {
    port?: string;
    cors?: boolean;
    dirListing?: boolean;
    dotfiles?: boolean;
    host?: string;
    cert?: string;
    key?: string;
    target?: string;
    headers?: string[];
};

export async function serve(options: ServeOptions) {
    const {
        target = '.',
        host = 'localhost',
        port = '4507',
        cors = true,
        cert,
        key,
        dotfiles = true,
        headers = ['Cache-Control: no-cache'],
    } = options;

    const args: string[] = [
        'run',
        '--no-check',
        '--allow-read',
        '--allow-net',
        FILE_SERVER_URL,
        target,
        '--host',
        host,
        '-p',
        `${port}`,
        '-v',
        `${cors ? '--cors' : ''}`,
        `${dotfiles ? '' : '--no-dotfiles'}`,
        `${cert ? '--cert' : ''}`,
        `${cert ? cert : ''}`,
        `${key ? '--key' : ''}`,
        `${key ? key : ''}`,
        ...headers.map((header) => `-H=${header}`),
    ];
    await util.runCmd(Deno.execPath(), { args });
}
