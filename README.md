This project is a Next.js application configured with Microsoft Entra ID (Azure AD) authentication via NextAuth.js.

## Prerequisites

- Node.js 18+ and npm
- An Azure Entra ID application registration with a client secret

## Environment Variables

Create a `.env.local` file in the project root and provide the following settings:

```
NEXTAUTH_SECRET=replace-with-a-long-random-string
NEXTAUTH_URL=http://localhost:3000
AZURE_AD_CLIENT_ID=your-azure-ad-client-id
AZURE_AD_CLIENT_SECRET=your-azure-ad-client-secret
AZURE_AD_TENANT_ID=your-azure-ad-tenant-id
AZURE_STORAGE_ACCOUNT_NAME=your-storage-account-name
AZURE_STORAGE_ACCOUNT_KEY=your-storage-account-key
# alternatively, provide AZURE_STORAGE_CONNECTION_STRING
# optional overrides
# AZURE_TABLE_WORKSPACES=Workspaces
# AZURE_TABLE_WORKSPACE_MEMBERS=WorkspaceMembers
```

> Use `npx next-auth secret` to generate a strong value for `NEXTAUTH_SECRET`.

## Running Locally

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the app.

## Azure Entra ID Configuration Checklist

1. In the Azure portal, register a new application (Web platform) with redirect URI `http://localhost:3000/api/auth/callback/azure-ad`.
2. Record the Application (client) ID and Directory (tenant) ID.
3. Create a client secret and copy the value.
4. Grant the application the Microsoft Graph delegated permissions `openid`, `profile`, `email`, and `User.Read`.
5. Create or reuse an Azure Storage account, capture the account name and key, and paste them into `.env.local`.
6. (Optional) pre-create Table Storage tables named `Workspaces` and `WorkspaceMembers`. The app will create them automatically if the identity has permission.

Once the app is running, you can sign in using the **Sign in with Microsoft** button on the homepage. The session state is managed by NextAuth, and protected routes can be added by leveraging `getServerSession` in server components or the `SessionProvider` in client components. Workspaces are stored in Azure Table Storage so they stay scoped to your Microsoft tenant.
