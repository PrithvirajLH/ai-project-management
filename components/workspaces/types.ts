export type WorkspaceListItem = {
  id: string
  name: string
  slug: string
  role: "owner" | "member"
  isPersonal: boolean
  ownerId: string
}

