# Advanced Patterns cho Novu

Dành cho Senior Developers, tập trung vào các logic thông báo phức tạp, tối ưu hóa và testing.

## 1. Digest Engine (Gộp thông báo)

Digest giúp tránh spam user bằng cách gộp nhiều sự kiện thành một thông báo duy nhất trong một khoảng thời gian.

**Use Case**: "Hung and 5 others liked your post" thay vì gửi 6 thông báo riêng lẻ.

### Cấu hình Digest trong Workflow

```typescript
import { workflow } from '@novu/framework';

export const commentWorkflow = workflow(
  'comment-on-post',
  async ({ step, payload }) => {
    // 1. Digest Step: Gom các event có cùng postId trong 10 phút
    const digestResult = await step.digest('digest-step', async () => ({
      amount: 10,
      unit: 'minutes',
      digestKey: 'postId', // Gom theo ID bài viết (payload.postId)
    }));

    // 2. Gửi thông báo
    await step.email('email-step', async () => {
      // digestResult.events chứa danh sách các event đã bị gom
      const count = digestResult.events.length;
      return {
        subject: `Bạn có ${count} bình luận mới`,
        body: `<ul>
              ${digestResult.events.map((e) => `<li>${e.payload.content}</li>`).join('')}
             </ul>`,
      };
    });
  },
);
```

## 2. Delay & Scheduled Notifications

Giữ chân user bằng cách gửi thông báo sau một khoảng thời gian nhất định.

**Use Case**: Gửi nhắc nhở "Bạn quên chưa thanh toán?" sau 1 giờ thêm vào giỏ hàng.

```typescript
await step.delay('wait-1-hour', async () => ({
  amount: 1,
  unit: 'hours',
}));

await step.email('reminder-email', async () => { ... });
```

## 3. Filtering & Conditions

Chỉ gửi thông báo nếu thỏa mãn điều kiện (VD: User opt-in receiving emails).

```typescript
await step.email('promo-email', async () => {
  return { ... };
}, {
  // Chỉ chạy step này nếu payload.isVip = true
  skip: () => payload.isVip !== true,
  // Hoặc check subscriber preference (Novu tự handle preference, nhưng đây là logic custom)
});
```

## 4. Testing Workflows

### Unit Test

Novu Framework tách biệt logic workflow ra khỏi runtime, nên có thể test logic function. Tuy nhiên, tốt nhất là chạy E2E test với Local Studio.

### Preview Email

Sử dụng **Novu Studio** (`npx novu dev`) để preview giao diện Email và In-App realtime mà không cần gửi tin thật.

## 5. Topics (Broadcast)

Gửi thông báo cho hàng triệu user cùng lúc (System Update).

1. **Tạo Topic**: `novu.topics.create({ key: 'all-users', name: 'All Users' })`
2. **Add Subscribers**: `novu.topics.addSubscribers('all-users', { subscribers: ['user-1', 'user-2'] })`
3. **Trigger**:
   ```typescript
   await novu.trigger('system-update', {
     to: [{ type: 'Topic', topicKey: 'all-users' }],
     payload: { version: '2.0.0' },
   });
   ```
