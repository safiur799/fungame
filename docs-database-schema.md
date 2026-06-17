# Database Schema

MongoDB database: `daily_number_draw`

Collection: `results`

```ts
type ResultDocument = {
  id: string;
  drawNumber: string;
  winningNumber: string;
  drawTime: Date;
  createdAt: Date;
};
```

Indexes created by the application:

```js
db.results.createIndex({ drawNumber: 1 }, { unique: true });
db.results.createIndex({ drawTime: -1 });
db.results.createIndex({ createdAt: -1 });
```

`drawNumber` format:

```txt
YYYYMMDD-HH00
```

Example:

```json
{
  "id": "6d53fb84-b0c3-4d96-b0e4-e9743b0f6e7d",
  "drawNumber": "20260617-1000",
  "winningNumber": "047",
  "drawTime": "2026-06-17T04:30:00.000Z",
  "createdAt": "2026-06-17T04:30:01.421Z"
}
```
