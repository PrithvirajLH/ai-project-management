import { randomUUID } from "node:crypto"

export function generateInvitationToken(): string {
  // Generate a secure, unique token using UUID
  return randomUUID()
}


