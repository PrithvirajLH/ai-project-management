# Testing API Endpoints

The new REST endpoints require authentication via NextAuth session cookies.

## Getting a Session Cookie

1. Open your browser and navigate to `http://localhost:3000`
2. Sign in with Microsoft
3. Open Developer Tools (F12)
4. Go to Application/Storage → Cookies → `http://localhost:3000`
5. Copy the value of `next-auth.session-token`

## Testing Endpoints

### 1. Create Card
```powershell
$sessionToken = "YOUR_SESSION_TOKEN_HERE"
$boardId = "YOUR_BOARD_ID"
$listId = "YOUR_LIST_ID"

curl.exe -X POST http://localhost:3000/api/cards `
  -H "Content-Type: application/json" `
  -H "Cookie: next-auth.session-token=$sessionToken" `
  -d "{\"title\":\"Test Card\",\"boardId\":\"$boardId\",\"listId\":\"$listId\"}"
```

### 2. Move Card
```powershell
$cardId = "CARD_ID_TO_MOVE"
$destinationListId = "DESTINATION_LIST_ID"
$destinationIndex = 0

curl.exe -X POST http://localhost:3000/api/cards/move `
  -H "Content-Type: application/json" `
  -H "Cookie: next-auth.session-token=$sessionToken" `
  -d "{\"boardId\":\"$boardId\",\"cardId\":\"$cardId\",\"destinationListId\":\"$destinationListId\",\"destinationIndex\":$destinationIndex}"
```

### 3. Update Card
```powershell
curl.exe -X PATCH http://localhost:3000/api/cards/$cardId `
  -H "Content-Type: application/json" `
  -H "Cookie: next-auth.session-token=$sessionToken" `
  -d "{\"boardId\":\"$boardId\",\"title\":\"Updated Title\",\"description\":\"Updated description\"}"
```

### 4. Create List
```powershell
curl.exe -X POST http://localhost:3000/api/lists `
  -H "Content-Type: application/json" `
  -H "Cookie: next-auth.session-token=$sessionToken" `
  -d "{\"title\":\"New List\",\"boardId\":\"$boardId\"}"
```

### 5. Rename List
```powershell
$listId = "LIST_ID_TO_RENAME"

curl.exe -X PATCH http://localhost:3000/api/lists/$listId `
  -H "Content-Type: application/json" `
  -H "Cookie: next-auth.session-token=$sessionToken" `
  -d "{\"boardId\":\"$boardId\",\"title\":\"Renamed List\"}"
```

## Getting Board/List IDs

You can get board and list IDs from:
- The URL when viewing a board: `/board/[boardId]`
- Browser DevTools Network tab when loading the board page
- The database/API responses

## Expected Responses

- **Success (201/200)**: `{"card": {...}}` or `{"list": {...}}`
- **Unauthorized (401)**: `{"error": "Unauthorized"}`
- **Not Found (404)**: `{"error": "Board not found"}` or similar
- **Validation Error (400)**: `{"error": {...}}` with Zod validation details

