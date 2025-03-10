import { exec } from 'child_process'
import { mkdir } from 'fs/promises'
import { promisify } from 'util'

/** Wipes a directory recursively. */
export const wipeDirectory = async (dirname: string) => {
    // rmdir force type is broken, don't wanna import a library jsut for it
    await promisify(exec)(`rm -rf ${dirname}`)

    await mkdir(dirname, { recursive: true })
}

/** Ensures a directory exists. */
export const ensureDirectory = async (dirname: string) => {
    await mkdir(dirname, { recursive: true })
}
