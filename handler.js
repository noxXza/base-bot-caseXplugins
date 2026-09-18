import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import caseHandler from './case.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginDir = path.join(__dirname, 'plugins')

export const plugins = new Map()
const pluginCache = new Map()
const watchers = new Map()
const pendingReloads = new Map()

function getPluginFiles(dir) {
    let files = []
    if (!fs.existsSync(dir)) return files
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, item.name)
        if (item.isDirectory()) files.push(...getPluginFiles(full))
        else if (item.isFile() && item.name.endsWith('.js')) files.push(full)
    }
    return files
}

async function loadPlugin(file) {
    try {
        const module = await import(`${pathToFileURL(file).href}?update=${Date.now()}`)
        const handler = module.default
        if (!handler) return

        if (pluginCache.has(file)) {
            for (const key of pluginCache.get(file)) plugins.delete(key)
        }

        const keys = []
        if (handler.command && !(handler.command instanceof RegExp)) {
            const commands = Array.isArray(handler.command) ? handler.command : [handler.command]
            for (const cmd of commands) {
                const key = String(cmd).toLowerCase()
                plugins.set(key, handler)
                keys.push(key)
            }
        }

        if (handler.customPrefix) {
            const key = Symbol(file)
            plugins.set(key, handler)
            keys.push(key)
        }

        pluginCache.set(file, keys)
    } catch (e) {
        console.error(`Gagal memuat plugin ${file}:`, e)
    }
}

async function unloadPlugin(file) {
    if (!pluginCache.has(file)) return
    for (const key of pluginCache.get(file)) plugins.delete(key)
    pluginCache.delete(file)
}

export async function initPlugins() {
    for (const file of getPluginFiles(pluginDir)) {
        await loadPlugin(file)
    }
    watch(pluginDir)
}

function watch(dir) {
    if (watchers.has(dir)) return
    watchers.set(dir, fs.watch(dir, (_, filename) => {
        if (!filename || !filename.endsWith('.js')) return
        const file = path.join(dir, filename)
        if (pendingReloads.has(file)) clearTimeout(pendingReloads.get(file))
        pendingReloads.set(file, setTimeout(async () => {
            pendingReloads.delete(file)
            if (fs.existsSync(file)) await loadPlugin(file)
            else await unloadPlugin(file)
        }, 200))
    }))
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        if (item.isDirectory()) watch(path.join(dir, item.name))
    }
}

export default async function handleMessage(sock, m, store) {
    try {
        let body = m.text || ''
        let command = ''
        let args = []

        const prefa = ["#", "!", ".", ",", "@", "/"]
        const prefixMatch = body.trim().match(/^[¬∞zZ#$@+,.?=''():‚àö%¬¢¬£¬•‚Ç¨œÄ¬§ŒÝŒ¶&><‚Ñ¢¬©¬ÆŒî^Œ≤Œ±¬¶|/\\¬©^]/)
        
        if (prefixMatch) {
            const prefixChar = prefixMatch[0]
            const withoutPrefix = body.trim().slice(prefixChar.length).trim()
            const parts = withoutPrefix.split(/\s+/)
            command = parts.shift().toLowerCase() || ''
            args = parts
        }

        const pluginHandler = plugins.get(command)

        if (pluginHandler) {
            return await pluginHandler(m, { sock, conn: sock, args, text: args.join(' '), command, store })
        }

        await caseHandler(sock, m, null, store)
    } catch (e) {
        console.error(e)
    }
}
