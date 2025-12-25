# API Endpoints

## Tổng quan
Tài liệu này mô tả các API endpoints của Notification Service, bao gồm các endpoint để gửi thông báo, quản lý templates và cài đặt người dùng.

## Base URL
```
https://api.yourdomain.com/notifications
```

## Xác thực
Tất cả các API yêu cầu xác thực thông qua JWT token:
```
Authorization: Bearer <your-jwt-token>
```

## 1. Notification Templates

### 1.1 Lấy danh sách templates
```http
GET /templates
```

**Query Parameters:**
- `page`: Số trang (mặc định: 1)
- `limit`: Số lượng bản ghi mỗi trang (mặc định: 10)
- `active`: Lọc theo trạng thái active (true/false)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "key": "order-confirmation",
      "name": "Xác nhận đơn hàng",
      "description": "Gửi khi khách hàng đặt hàng thành công",
      "active": true,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### 1.2 Tạo mới template
```http
POST /templates
```

**Request Body:**
```json
{
  "key": "welcome-email",
  "name": "Chào mừng",
  "description": "Gửi khi người dùng đăng ký tài khoản mới",
  "workflowId": "welcome-email-workflow",
  "variables": {
    "userName": {
      "type": "string",
      "required": true
    },
    "verificationLink": {
      "type": "string",
      "format": "uri"
    }
  }
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "key": "welcome-email",
  "name": "Chào mừng",
  "description": "Gửi khi người dùng đăng ký tài khoản mới",
  "active": true,
  "workflowId": "welcome-email-workflow",
  "variables": {
    "userName": {
      "type": "string",
      "required": true
    },
    "verificationLink": {
      "type": "string",
      "format": "uri"
    }
  },
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

## 2. Notifications

### 2.1 Gửi thông báo
```http
POST /send
```

**Request Body:**
```json
{
  "templateKey": "order-confirmation",
  "recipient": "user-123",
  "data": {
    "orderId": "order-123",
    "orderTotal": 1000000,
    "items": [
      {"name": "Sản phẩm 1", "quantity": 1, "price": 500000},
      {"name": "Sản phẩm 2", "quantity": 2, "price": 250000}
    ]
  },
  "channels": ["email", "sms"]
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "notificationId": "notification-123",
    "status": "pending"
  }
}
```

### 2.2 Lấy lịch sử thông báo
```http
GET /history
```

**Query Parameters:**
- `userId`: Lọc theo người dùng
- `templateKey`: Lọc theo template
- `status`: Lọc theo trạng thái (pending/sent/failed)
- `startDate`: Ngày bắt đầu (ISO format)
- `endDate`: Ngày kết thúc (ISO format)
- `page`: Số trang (mặc định: 1)
- `limit`: Số lượng bản ghi mỗi trang (mặc định: 10)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "notification-123",
      "templateKey": "order-confirmation",
      "channel": "email",
      "status": "sent",
      "recipient": "user-123",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:01.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

## 3. User Preferences

### 3.1 Lấy cài đặt thông báo
```http
GET /preferences
```

**Response (200 OK):**
```json
{
  "userId": "user-123",
  "preferences": {
    "email": true,
    "sms": false,
    "push": true,
    "inApp": true,
    "globalOptOut": false
  },
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### 3.2 Cập nhật cài đặt
```http
PATCH /preferences
```

**Request Body:**
```json
{
  "email": true,
  "sms": false,
  "push": true,
  "inApp": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "preferences": {
      "email": true,
      "sms": false,
      "push": true,
      "inApp": true,
      "globalOptOut": false
    },
    "updatedAt": "2023-01-01T00:00:01.000Z"
  }
}
```

### 3.3 Hủy đăng ký nhận thông báo
```http
POST /unsubscribe
```

**Request Body:**
```json
{
  "userId": "user-123",
  "channel": "email" // optional, nếu không có sẽ hủy tất cả
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Unsubscribed successfully"
}
```

## 4. Admin Endpoints

### 4.1 Lấy thống kê thông báo
```http
GET /admin/stats
```

**Query Parameters:**
- `startDate`: Ngày bắt đầu (ISO format)
- `endDate`: Ngày kết thúc (ISO format)
- `channel`: Lọc theo kênh (email/sms/push/inApp)
- `templateKey`: Lọc theo template

**Response (200 OK):**
```json
{
  "totalSent": 1000,
  "deliveryRate": 98.5,
  "openRate": 45.2,
  "clickRate": 12.3,
  "byChannel": [
    {"channel": "email", "count": 700, "rate": 70},
    {"channel": "sms", "count": 200, "rate": 20},
    {"channel": "push", "count": 100, "rate": 10}
  ],
  "byTemplate": [
    {"templateKey": "order-confirmation", "count": 400, "rate": 40},
    {"templateKey": "welcome-email", "count": 300, "rate": 30},
    {"templateKey": "password-reset", "count": 200, "rate": 20}
  ]
}
```

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "templateKey",
      "message": "Template key is required"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Template not found"
}
```

### 429 Too Many Requests
```json
{
  "statusCode": 429,
  "message": "Too many requests, please try again later",
  "retryAfter": 60
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

## Rate Limiting
- Tối đa 100 requests/phút cho mỗi user
- Tối đa 1000 requests/phút cho mỗi IP
- Tối đa 10 requests/giây cho mỗi endpoint

## Versioning
API được version thông qua header:
```
Accept: application/vnd.yourapi.v1+json
```

## Pagination
Tất cả các API trả về danh sách đều hỗ trợ phân trang với các tham số:
- `page`: Số trang (bắt đầu từ 1)
- `limit`: Số lượng bản ghi mỗi trang (mặc định: 10)

Kết quả trả về bao gồm:
- `data`: Mảng các bản ghi
- `meta`: Thông tin phân trang
  - `page`: Trang hiện tại
  - `limit`: Số bản ghi mỗi trang
  - `total`: Tổng số bản ghi
  - `totalPages`: Tổng số trang

## Sorting
Một số API hỗ trợ sắp xếp thông qua tham số `sort`:
```
GET /notifications?sort=-createdAt,status
```

Trong đó:
- `-` trước trường để sắp xếp giảm dần
- Không có dấu `-` để sắp xếp tăng dần
- Nhiều trường cách nhau bởi dấu phẩy

## Filtering
Một số API hỗ trợ lọc thông qua các tham số query:
```
GET /notifications?status=sent&channel=email&createdAt[gte]=2023-01-01
```

Các toán tử hỗ trợ:
- `eq`: Bằng
- `ne`: Không bằng
- `gt`: Lớn hơn
- `lt`: Nhỏ hơn
- `gte`: Lớn hơn hoặc bằng
- `lte`: Nhỏ hơn hoặc bằng
- `in`: Trong danh sách
- `like`: Tìm kiếm gần đúng

## Field Selection
Một số API hỗ trợ chọn trường trả về thông qua tham số `fields`:
```
GET /notifications?fields=id,templateKey,status,createdAt
```

## Related Resources
Một số API hỗ trợ include các tài nguyên liên quan thông qua tham số `include`:
```
GET /notifications?include=template,user
```

## Error Handling
Tất cả các lỗi đều trả về theo định dạng:
```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "path": "/api/notifications"
}
```

## Webhooks
Notification Service cũng hỗ trợ webhook để nhận các sự kiện từ hệ thống bên thứ ba.

### 1. Đăng ký webhook
```http
POST /webhooks
```

**Request Body:**
```json
{
  "url": "https://your-callback-url.com/notifications",
  "events": ["notification.sent", "notification.delivered", "notification.failed"],
  "secret": "your-secret-key"
}
```

### 2. Xác thực webhook
Tất cả các request webhook đều được ký bằng HMAC-SHA256 và gửi kèm trong header:
```
X-Webhook-Signature: sha256=<signature>
```

### 3. Payload mẫu
```json
{
  "event": "notification.sent",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "data": {
    "notificationId": "notification-123",
    "templateKey": "order-confirmation",
    "channel": "email",
    "recipient": "user-123",
    "status": "sent",
    "payload": {
      "orderId": "order-123"
    }
  }
}
```
