import { randomUUID } from "node:crypto"

import { createTableClient, getEntity, listEntities, upsertEntity } from "@/lib/azure-tables"

const WORKSPACES_TABLE = "workspaces"

type WorkspaceEntity = {
  partitionKey: string
  rowKey: string
  name: string
  slug: string
  ownerId: string
  isPersonal: boolean
  createdAt: string
  updatedAt: string
}

export type Workspace = {
  id: string
  name: string
  slug: string
  isPersonal: boolean
  ownerId: string
  createdAt: Date
  updatedAt: Date
}

function toWorkspaceEntity(input: WorkspaceEntity): Workspace {
  return {
    id: input.rowKey,
    name: input.name,
    slug: input.slug,
    isPersonal: input.isPersonal,
    ownerId: input.ownerId,
    createdAt: new Date(input.createdAt),
    updatedAt: new Date(input.updatedAt),
  }
}

function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .replace(/-{2,}/g, "-")
}

async function ensureTable() {
  const client = createTableClient(WORKSPACES_TABLE)
  try {
    await client.createTable()
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 409) {
      throw error
    }
  }
  return client
}

export async function ensurePersonalWorkspace({
  userId,
  userName,
}: {
  userId: string
  userName?: string | null
}) {
  const client = await ensureTable()
  const partitionKey = userId
  const rowKey = "personal"

  const existing = await getEntity<WorkspaceEntity>(client, partitionKey, rowKey)
  if (existing) {
    return toWorkspaceEntity(existing)
  }

  const now = new Date().toISOString()
  const name = userName ? `${userName}'s Personal Workspace` : "Personal Workspace"
  const entity: WorkspaceEntity = {
    partitionKey,
    rowKey,
    name,
    slug: "personal",
    ownerId: userId,
    isPersonal: true,
    createdAt: now,
    updatedAt: now,
  }

  await upsertEntity(client, entity)
  return toWorkspaceEntity(entity)
}

export async function createWorkspace({
  userId,
  name,
}: {
  userId: string
  name: string
}) {
  const client = await ensureTable()
  const partitionKey = userId
  const base = slugify(name) || "workspace"
  let slug = base
  let suffix = 1

  async function slugExists(candidate: string) {
    const entities = await listEntities<WorkspaceEntity>(
      client,
      `PartitionKey eq '${partitionKey.replace(/'/g, "''")}' and slug eq '${candidate.replace(/'/g, "''")}'`
    )
    return entities.length > 0
  }

  while (await slugExists(slug)) {
    slug = `${base}-${suffix}`
    suffix += 1
  }

  const now = new Date().toISOString()
  const rowKey = randomUUID()

  const entity: WorkspaceEntity = {
    partitionKey,
    rowKey,
    name,
    slug,
    ownerId: userId,
    isPersonal: false,
    createdAt: now,
    updatedAt: now,
  }

  await upsertEntity(client, entity)
  return toWorkspaceEntity(entity)
}

export async function listWorkspaces(userId: string) {
  const client = await ensureTable()
  const results = await listEntities<WorkspaceEntity>(
    client,
    `PartitionKey eq '${userId.replace(/'/g, "''")}'`
  )
  return results.map(toWorkspaceEntity).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
}


