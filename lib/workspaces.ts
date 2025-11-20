import { randomUUID } from "node:crypto"

import { createTableClient, getEntity, listEntities, upsertEntity } from "@/lib/azure-tables"

const WORKSPACES_TABLE = "workspaces"
const WORKSPACE_MEMBERSHIPS_TABLE = "workspaceMemberships"
const WORKSPACE_INVITATIONS_TABLE = "workspaceInvitations"

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
  userName?: string | null
  userEmail?: string | null
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

export type WorkspaceInvitationStatus = "pending" | "accepted" | "rejected" | "expired"

type WorkspaceInvitationEntity = {
  partitionKey: string // workspaceId
  rowKey: string // invitationId (UUID)
  email: string
  workspaceName: string
  invitedBy: string // userId who sent invite
  invitedByName?: string
  role: WorkspaceMembershipRole // "member"
  status: WorkspaceInvitationStatus
  invitationToken: string // secure token for invite link
  expiresAt: string // ISO date
  createdAt: string
  updatedAt: string
}

export type WorkspaceInvitation = {
  id: string
  workspaceId: string
  email: string
  workspaceName: string
  invitedBy: string
  invitedByName?: string
  role: WorkspaceMembershipRole
  status: WorkspaceInvitationStatus
  invitationToken: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

export type WorkspaceMember = {
  userId: string
  workspaceId: string
  role: WorkspaceMembershipRole
  isPersonal: boolean
  name?: string | null
  email?: string | null
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

export async function ensureMembershipTable() {
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

async function ensureInvitationsTable() {
  const client = createTableClient(WORKSPACE_INVITATIONS_TABLE)
  try {
    await client.createTable()
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 409) {
      throw error
    }
  }
  return client
}

function formatPersonalWorkspaceName() {
  return "My Workspace"
}

export async function ensurePersonalWorkspace({
  userId,
  userName,
  userEmail,
}: {
  userId: string
  userName?: string | null
  userEmail?: string | null
}) {
  const client = await ensureTable()
  const membershipClient = await ensureMembershipTable()
  const partitionKey = userId
  const rowKey = "personal"
  const desiredName = formatPersonalWorkspaceName()

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
      userName,
      userEmail,
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
    userName,
    userEmail,
  })
  return workspace
}

export async function createWorkspace({
  userId,
  name,
  userName,
  userEmail,
}: {
  userId: string
  name: string
  userName?: string | null
  userEmail?: string | null
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
    userName,
    userEmail,
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

export async function ensureWorkspaceMembership({
  membershipClient,
  workspace,
  userId,
  role,
  userName,
  userEmail,
}: {
  membershipClient: Awaited<ReturnType<typeof ensureMembershipTable>>
  workspace: Workspace
  userId: string
  role: WorkspaceMembershipRole
  userName?: string | null
  userEmail?: string | null
}) {
  const now = new Date().toISOString()
  const membership: WorkspaceMembershipEntity = {
    partitionKey: userId,
    rowKey: workspace.id,
    userName: userName ?? undefined,
    userEmail: userEmail ?? undefined,
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

export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const membershipClient = await ensureMembershipTable()
  const entities = await listEntities<WorkspaceMembershipEntity>(
    membershipClient,
    `RowKey eq '${escapeValue(workspaceId)}'`
  )

  return entities
    .map((entity) => ({
      userId: entity.partitionKey,
      workspaceId: entity.rowKey,
      role: entity.role,
      isPersonal: entity.isPersonal,
      name: entity.userName ?? null,
      email: entity.userEmail ?? null,
      createdAt: new Date(entity.createdAt),
      updatedAt: new Date(entity.updatedAt),
    }))
    .sort((a, b) => {
      if (a.role === b.role) {
        return a.createdAt.getTime() - b.createdAt.getTime()
      }
      return a.role === "owner" ? -1 : 1
    })
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

function toWorkspaceInvitation(entity: WorkspaceInvitationEntity): WorkspaceInvitation {
  return {
    id: entity.rowKey,
    workspaceId: entity.partitionKey,
    email: entity.email,
    workspaceName: entity.workspaceName,
    invitedBy: entity.invitedBy,
    invitedByName: entity.invitedByName ?? undefined,
    role: entity.role,
    status: entity.status,
    invitationToken: entity.invitationToken,
    expiresAt: new Date(entity.expiresAt),
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
  }
}

export async function createWorkspaceInvitation({
  workspaceId,
  email,
  workspaceName,
  invitedBy,
  invitedByName,
  role,
  invitationToken,
  expiresAt,
}: {
  workspaceId: string
  email: string
  workspaceName: string
  invitedBy: string
  invitedByName?: string
  role: WorkspaceMembershipRole
  invitationToken: string
  expiresAt: Date
}): Promise<WorkspaceInvitation> {
  const client = await ensureInvitationsTable()
  const now = new Date().toISOString()
  const invitationId = randomUUID()

  const entity: WorkspaceInvitationEntity = {
    partitionKey: workspaceId,
    rowKey: invitationId,
    email,
    workspaceName,
    invitedBy,
    invitedByName: invitedByName ?? undefined,
    role,
    status: "pending",
    invitationToken,
    expiresAt: expiresAt.toISOString(),
    createdAt: now,
    updatedAt: now,
  }

  await upsertEntity(client, entity)
  return toWorkspaceInvitation(entity)
}

export async function getWorkspaceInvitationByToken(
  invitationToken: string
): Promise<WorkspaceInvitation | null> {
  const client = await ensureInvitationsTable()
  const results = await listEntities<WorkspaceInvitationEntity>(
    client,
    `invitationToken eq '${escapeValue(invitationToken)}'`
  )
  const entity = results[0]
  if (!entity) return null
  return toWorkspaceInvitation(entity)
}

export async function listWorkspaceInvitations(
  workspaceId: string
): Promise<WorkspaceInvitation[]> {
  const client = await ensureInvitationsTable()
  const results = await listEntities<WorkspaceInvitationEntity>(
    client,
    `PartitionKey eq '${escapeValue(workspaceId)}'`
  )
  return results.map(toWorkspaceInvitation).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function updateInvitationStatus({
  invitationId,
  workspaceId,
  status,
}: {
  invitationId: string
  workspaceId: string
  status: WorkspaceInvitationStatus
}): Promise<WorkspaceInvitation | null> {
  const client = await ensureInvitationsTable()
  const existing = await getEntity<WorkspaceInvitationEntity>(client, workspaceId, invitationId)
  if (!existing) return null

  const updated: WorkspaceInvitationEntity = {
    ...existing,
    status,
    updatedAt: new Date().toISOString(),
  }

  await upsertEntity(client, updated)
  return toWorkspaceInvitation(updated)
}


