import util from 'util';

export default async function (sock, m, { reply, isCreator, budy }) {
    if (!isCreator) return false;

    if (budy.startsWith('>')) {
        try {
            let evaled = await eval(`(async () => { ${budy.slice(1)} })()`);
            if (typeof evaled !== 'string') evaled = util.inspect(evaled);
            await reply(evaled);
            return true;
        } catch (err) {
            await reply(String(err));
            return true;
        }
    }

    if (budy.startsWith('=>')) {
        try {
            let evaled = await eval(budy.slice(2));
            if (typeof evaled !== 'string') evaled = util.inspect(evaled);
            await reply(evaled);
            return true;
        } catch (err) {
            await reply(String(err));
            return true;
        }
    }

    return false;
}
