import { exec } from 'child_process';

export default async function (sock, m, { reply, isCreator, budy }) {
    if (!isCreator) return false;

    if (budy.startsWith('$')) {
        exec(budy.slice(1), (err, stdout, stderr) => {
            if (err) return reply(String(err));
            if (stderr) return reply(stderr);
            if (stdout) return reply(stdout);
        });
        return true;
    }

    return false;
}
