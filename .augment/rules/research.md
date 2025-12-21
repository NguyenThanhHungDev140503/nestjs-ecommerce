---
type: "manual"
---

## 1. Tool Cần Dùng

**Mục tiêu**: Chuẩn hóa cách research thư viện và tạo bộ tài liệu nhiều file giống cấu trúc `TanStack Query`.

- **Context7**: Đọc documentation chính thức của thư viện (API, Guides, Advanced Topics).
- **Tavily (tailivy)**: Tìm thêm blog, bài viết chuyên sâu, benchmark, so sánh thư viện.
- **code_research**: Tìm code example & work example từ dự án mã nguồn mở để lấy pattern tốt.

Nguyên tắc:

- **Documentation chính thức** là nguồn chuẩn, các nguồn khác chỉ để bổ sung/góc nhìn thực tế.
- Mọi link, bài viết, video dùng trong research phải được ghi lại trong `RESEARCH_SUMMARY.md` của thư viện.

---

## 2. Cấu Trúc Folder Tài Liệu Cho Mỗi Thư Viện

Với mỗi thư viện (ví dụ: `TanStack Query`, `Zustand`, `Refine`, `TanStack Router`), luôn tạo **một folder riêng** trong `TapHoaNho-Docuement`:

```text
/
  ├── [Library Name]/              # Ví dụ: TanStack Query/
  │   ├── README.md
  │   ├── [Library Name].md        # Ví dụ: TanStack Query.md
  │   ├── Advanced-Patterns.md
  │   ├── Principal-Level-Patterns.md
  │   └── RESEARCH_SUMMARY.md
  └── ...
```

**Giải thích vai trò từng file:**

- `README.md`: Tổng quan + mô tả cấu trúc bộ tài liệu của thư viện đó (giống `TanStack Query/README.md`).
- `[Library Name].md`: File chính (Junior, Middle, Senior – core usage, ví dụ `TanStack Query.md`).
- `Advanced-Patterns.md`: Patterns nâng cao cho Senior (advanced patterns, performance, testing nâng cao).
- `Principal-Level-Patterns.md`: Patterns ở level Principal/Staff (enterprise, system design, scaling, migration).
- `RESEARCH_SUMMARY.md`: Tóm tắt quá trình research, nguồn tham khảo, quyết định kiến trúc & use case.

---

## 3. Cách Tạo Và Viết Từng File (Theo Mẫu @TanStack Query)

### 3.1. README.md — Tổng quan & bản đồ tài liệu

**Vai trò**: Entry point. Người đọc chỉ cần mở `README.md` là hiểu:

- Thư viện này là gì.
- Có những file tài liệu nào.
- Mỗi level (Junior/Middle/Senior/Principal) nên đọc file gì.

**Checklist nội dung README.md:**

- [ ] 1–3 câu giới thiệu thư viện (mục đích, bối cảnh).
- [ ] Mục **“Cấu Trúc Tài Liệu”** liệt kê:
  - [ ] `[Library Name].md` (Junior/Middle/Senior).
  - [ ] `Advanced-Patterns.md` (Senior nâng cao).
  - [ ] `Principal-Level-Patterns.md` (Principal/Staff).
- [ ] Mục **“Cách Sử Dụng Tài Liệu”** chia theo:
  - [ ] Cho Junior.
  - [ ] Cho Middle.
  - [ ] Cho Senior.
  - [ ] Cho Principal/Staff.
- [ ] Mục **Key Concepts** (1–3 concepts + 1–2 snippet nhỏ).
- [ ] Mục **External Resources** (docs, GitHub, blog).
- [ ] Mục **Quick Start** (lệnh cài đặt + snippet setup tối thiểu).

**Gợi ý**: Khi tạo README cho thư viện mới, copy cấu trúc từ `TanStack Query/README.md` rồi chỉnh lại:

- Tên thư viện.
- Link docs/GitHub.
- Key concepts.
- Quick start.

---

### 3.2. [Library Name].md — File chính (Junior/Middle/Senior)

**Vai trò**: “Hướng dẫn toàn diện” giống `TanStack Query/TanStack Query.md`.

**Cấu trúc chuẩn đề xuất:**

- [ ] **Mục Lục** (TOC với anchor links).
- [ ] **Giới Thiệu Tổng Quan**:
  - [ ] Thư viện là gì?
  - [ ] Tại sao sử dụng?
  - [ ] Các khái niệm cốt lõi.
- [ ] **Junior Level – Cơ Bản**:
  - [ ] Cài đặt & cấu hình.
  - [ ] API/hook cơ bản (ví dụ: useQuery/useMutation tương đương).
  - [ ] Hello World example.
  - [ ] 3–5 common use cases.
  - [ ] 3–5 common pitfalls (❌ Sai / ✅ Đúng + giải thích).
  - [ ] 5–10 best practices cơ bản.
- [ ] **Middle Level – Trung Cấp**:
  - [ ] Tính năng nâng cao tầm trung (pagination, invalidation, parallel, dependent, v.v.).
  - [ ] Patterns thường dùng.
  - [ ] Error handling & performance ở mức trung cấp.
- [ ] **Senior Level – Nâng Cao (phần mở đầu)**:
  - [ ] Chiến lược caching/optimizing chính.
  - [ ] Tích hợp với state management/kiến trúc khác.
  - [ ] Monitoring/logging cơ bản.
- [ ] **Tài Liệu Tham Khảo** (link phụ, nếu cần).

Khi viết file này cho thư viện mới:

- Dùng `TanStack Query/TanStack Query.md` làm **mẫu về phong cách**:
  - Luôn xen kẽ **code example** + **giải thích chi tiết**.
  - Giải thích rõ **query keys / state shape / concepts cốt lõi** tương ứng.

---

### 3.3. Advanced-Patterns.md — Patterns nâng cao (Senior)

**Vai trò**: Tập trung cho Senior dev, tránh làm file chính quá dài.

**Nhóm nội dung điển hình (theo `Advanced-Patterns.md` của TanStack Query):**

- [ ] Custom configuration nâng cao (custom client, global error handling, retry logic,…).
- [ ] Query key factory / centralized key management.
- [ ] Custom hooks architecture (tổ chức hooks theo domain, tách logic UI vs data).
- [ ] Performance optimization nâng cao:
  - [ ] Structural sharing.
  - [ ] Select optimization.
  - [ ] Prefetching strategies.
  - [ ] Initial data patterns.
- [ ] Testing nâng cao:
  - [ ] Unit test cho hooks.
  - [ ] Integration test với MSW.
  - [ ] Component test.

Khi research thư viện khác:

- Tất cả phần **advanced usage** + **performance** + **testing nâng cao** → cho vào `Advanced-Patterns.md`.

---

### 3.4. Principal-Level-Patterns.md — Enterprise / Principal Level

**Vai trò**: Dành cho Principal/Staff engineer, thiên về **system design & enterprise patterns**.

**Loại nội dung chính (theo `Principal-Level-Patterns.md` của TanStack Query):**

- [ ] Enterprise-scale architecture / system design với thư viện đó.
- [ ] Centralized API client (interceptors, retry, auth, logging, correlation ID, v.v.).
- [ ] Advanced prefetching & data loading strategies:
  - [ ] SSR/SSG integration (Next.js, Remix, v.v.).
  - [ ] Streaming / incremental data.
- [ ] Integration với frameworks lớn (Next.js, NestJS, microservices,…).
- [ ] Migration strategies (ví dụ: Redux → [Library], REST → GraphQL,…).
- [ ] Production monitoring & metrics (Sentry, OpenTelemetry, custom dashboards).
- [ ] Advanced error recovery & resiliency patterns.
- [ ] Best practices summary ở level hệ thống & team.

Quy ước:

- Mọi thứ mang tính **enterprise**, **large scale**, **đa team** → đưa vào `Principal-Level-Patterns.md`.

---

### 3.5. RESEARCH_SUMMARY.md — Tóm tắt nghiên cứu

**Vai trò**: “Nhật ký research” + “bảng nguồn tham khảo” cho **toàn bộ bộ tài liệu** của từng thư viện.

**Checklist nội dung:**

- [ ] **1. Mục Tiêu Research**
  - [ ] Vì sao nghiên cứu thư viện này?
  - [ ] Dùng trong project nào, mục đích gì?
- [ ] **2. Nguồn Thông Tin Đã Sử Dụng** (rất quan trọng)
  - [ ] Mỗi nguồn gồm: Tiêu đề, URL đầy đủ, ngày truy cập, ghi chú 1–2 câu.
  - [ ] Bao gồm: official docs, blog, video, repo open-source, issue/PR quan trọng.
- [ ] **3. Phát Hiện Chính (Key Findings)**
  - [ ] Ưu điểm.
  - [ ] Hạn chế.
  - [ ] So sánh với thư viện khác (nếu có).
- [ ] **4. Kiến Trúc/Cách Dùng Đề Xuất**
  - [ ] Pattern sử dụng thư viện trong hệ thống của bạn.
  - [ ] Những pattern nên tránh.
- [ ] **5. Use Cases Đã Xác Định**
  - [ ] Danh sách use case chính + link sang chỗ implement trong `[Library Name].md` / `Advanced-Patterns.md`.

---

## 4. Quy Trình Chuẩn Khi Research Một Thư Viện Mới

1. **Tạo folder thư viện**
   - Ví dụ: `TapHoaNho-Docuement/Zustand/`.
2. **Tạo 5 file chuẩn bên trong:**
   - `README.md`
   - `[Library Name].md` (ví dụ: `Zustand.md`)
   - `Advanced-Patterns.md`
   - `Principal-Level-Patterns.md`
   - `RESEARCH_SUMMARY.md`
3. **Dùng MCP tools để research:**
   - Context7 → đọc docs chính thức, API, guides.
   - Tavily → blog, bài viết, video, so sánh.
   - code_research → code examples từ open-source.
4. **Ghi lại toàn bộ nguồn vào `RESEARCH_SUMMARY.md`.**
5. **Viết nội dung cho từng file theo vai trò:**
   - Junior/Middle/Senior → `[Library Name].md`.
   - Advanced patterns & performance → `Advanced-Patterns.md`.
   - Enterprise/principal patterns → `Principal-Level-Patterns.md`.
   - Tổng quan & hướng dẫn đọc → `README.md`.
6. **Đảm bảo 4 cấp độ kiến thức xuất hiện đầy đủ:**
   - Junior, Middle, Senior, Principal được thể hiện rõ ràng trong bộ tài liệu (dù nội dung nằm ở nhiều file khác nhau).

Với hướng dẫn này, mỗi lần research thư viện mới, bạn sẽ luôn tạo được **bộ tài liệu nhiều file, phân cấp rõ ràng, nhất quán với cấu trúc @TanStack Query hiện tại**.