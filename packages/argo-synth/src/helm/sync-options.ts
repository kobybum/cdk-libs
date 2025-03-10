/**
 * Syncing options for ArgoCD Applications
 */
export type ArgoAppSyncOptions = {
    createNamespace: boolean
    /** @default false */
    serverSideApply?: boolean
}

/** Converts SyncOptions to an argo acceptable format */
export const renderSyncOptions = ({
    createNamespace,
    serverSideApply,
}: ArgoAppSyncOptions): string[] => {
    const flags: string[] = []

    createNamespace && flags.push('CreateNamespace')

    serverSideApply && flags.push('ServerSideApply')

    return flags.map((flag) => `${flag}=true`)
}
