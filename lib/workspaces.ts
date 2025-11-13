import { randomUUID } from "node:crypto"

import { createTableClient, getEntity, listEntities, upsertEntity } from "@/lib/azure-tables"

const WORKSPACES_TABLE = "workspaces"
const WORKSPACE_MEMBERSHIPS_TABLE = "workspaceMemberships"

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

export type WorkspaceMembershipRole = "owner" | "member"

type WorkspaceMembershipEntity = {
  partitionKey: string
  rowKey: string
  workspaceName: string
  workspaceSlug: string
  role: WorkspaceMembershipRole
  isPersonal: boolean
  ownerId: string
  createdAt: string
  updatedAt: string
}

export type WorkspaceSummary = {
  id: string
  name: string
  slug: string
  isPersonal: boolean
  ownerId: string
  role: WorkspaceMembershipRole
  createdAt: Date
  updatedAt: Date
}

function escapeValue(value: string) {
  return value.replace(/'/g, "''")
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

async function ensureMembershipTable() {
  const client = createTableClient(WORKSPACE_MEMBERSHIPS_TABLE)
  try {
    await client.createTable()
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 409) {
      throw error
    }
  }
  return client
}

function getFirstName(userName?: string | null) {
  if (!userName) return null
  const trimmed = userName.trim()
  if (!trimmed) return null
  const parts = trimmed.split(/\s+/)
  return parts[0]
}

function formatPersonalWorkspaceName(userName?: string | null) {
  const firstName = getFirstName(userName)
  if (!firstName) {
    return "My Workspace"
  }
  const suffix = firstName.endsWith("s") || firstName.endsWith("S") ? "'" : "'s"
  return `${firstName}${suffix} Workspace`
}

export async function ensurePersonalWorkspace({
  userId,
  userName,
}: {
  userId: string
  userName?: string | null
}) {
  const client = await ensureTable()
  const membershipClient = await ensureMembershipTable()
  const partitionKey = userId
  const rowKey = "personal"
  const desiredName = formatPersonalWorkspaceName(userName)

  const existing = await getEntity<WorkspaceEntity>(client, partitionKey, rowKey)
  if (existing) {
    const workspaceEntity: WorkspaceEntity = {
      partitionKey,
      rowKey,
      name: existing.name,
      slug: existing.slug,
      ownerId: existing.ownerId,
      isPersonal: existing.isPersonal,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    }

    if (workspaceEntity.name !== desiredName) {
      workspaceEntity.name = desiredName
      workspaceEntity.updatedAt = new Date().toISOString()
      await upsertEntity(client, workspaceEntity)
    }

    const workspace = toWorkspaceEntity(workspaceEntity)
    await ensureWorkspaceMembership({
      membershipClient,
      workspace,
      userId,
      role: "owner",
    })
    return workspace
  }

  const now = new Date().toISOString()
  const name = desiredName
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
  const workspace = toWorkspaceEntity(entity)
  await ensureWorkspaceMembership({
    membershipClient,
    workspace,
    userId,
    role: "owner",
  })
  return workspace
}

export async function createWorkspace({
  userId,
  name,
}: {
  userId: string
  name: string
}) {
  const client = await ensureTable()
  const membershipClient = await ensureMembershipTable()
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
  const workspace = toWorkspaceEntity(entity)
  await ensureWorkspaceMembership({
    membershipClient,
    workspace,
    userId,
    role: "owner",
  })
  return workspace
}

export async function listWorkspaces(userId: string) {
  const client = await ensureTable()
  const results = await listEntities<WorkspaceEntity>(
    client,
    `PartitionKey eq '${escapeValue(userId)}'`
  )
  return results.map(toWorkspaceEntity).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
}

async function ensureWorkspaceMembership({
  membershipClient,
  workspace,
  userId,
  role,
}: {
  membershipClient: Awaited<ReturnType<typeof ensureMembershipTable>>
  workspace: Workspace
  userId: string
  role: WorkspaceMembershipRole
}) {
  const now = new Date().toISOString()
  const membership: WorkspaceMembershipEntity = {
    partitionKey: userId,
    rowKey: workspace.id,
    workspaceName: workspace.name,
    workspaceSlug: workspace.slug,
    role,
    isPersonal: workspace.isPersonal,
    ownerId: workspace.ownerId,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: now,
  }

  await upsertEntity(membershipClient, membership)
}

function toWorkspaceSummary(entity: WorkspaceMembershipEntity): WorkspaceSummary {
  return {
    id: entity.rowKey,
    name: entity.workspaceName,
    slug: entity.workspaceSlug,
    isPersonal: entity.isPersonal,
    ownerId: entity.ownerId,
    role: entity.role,
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
  }
}

export async function listAccessibleWorkspaces(userId: string) {
  const membershipClient = await ensureMembershipTable()
  const entities = await listEntities<WorkspaceMembershipEntity>(
    membershipClient,
    `PartitionKey eq '${escapeValue(userId)}'`
  )
  return entities.map(toWorkspaceSummary).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
}

export async function getWorkspaceMembership(userId: string, workspaceId: string) {
  const membershipClient = await ensureMembershipTable()
  const membership = await getEntity<WorkspaceMembershipEntity>(
    membershipClient,
    userId,
    workspaceId
  )
  return membership ? toWorkspaceSummary(membership) : null
}

export async function getWorkspaceById(workspaceId: string) {
  const client = await ensureTable()
  const results = await listEntities<WorkspaceEntity>(
    client,
    `RowKey eq '${escapeValue(workspaceId)}'`
  )
  const entity = results[0]
  return entity ? toWorkspaceEntity(entity) : null
}


