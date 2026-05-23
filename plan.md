# Ke hoach danh gia va hoan thien AI Agent Tools

## Pham vi

File can xem chinh: `backend/src/services/aiAgent.js`.

Muc tieu la danh gia 4 tool hien tai cua AI agent, research cac tool pho bien/phu hop cho ung dung quan ly tien ca nhan, sau do de xuat cach sua hoac bo sung tool. Giai doan nay chi lap ke hoach, chua sua source code.

## Rang buoc bat buoc

- App chi dung VND. Khong them multi-currency, exchange-rate logic vao luong ghi nhan giao dich.
- So tien phai la so nguyen VND, khong decimal.
- Moi truy van backend lien quan du lieu nguoi dung phai scope theo `userId`.
- Tool co side effect nhu tao giao dich phai validate dau vao chat che.
- Business logic nam trong services, routes/controllers giu mong.
- Neu tool lam thay doi du lieu, frontend can nhan biet de refresh state dung cach.

## Nguon tham khao

- LangChain Tools: https://docs.langchain.com/oss/javascript/langchain/tools
- LangChain Agents: https://docs.langchain.com/oss/javascript/langchain/agents
- Gemini Function Calling: https://ai.google.dev/gemini-api/docs/function-calling
- Local schema/API:
  - `backend/sql/schema.sql`
  - `backend/src/services/transaction.service.js`
  - `backend/src/services/wallet.service.js`
  - `backend/src/services/budget.service.js`
  - `backend/src/services/aiAgent.js`
  - `frontend/utils/api.ts`
  - `frontend/store/app-store.ts`

## Tieu chi danh gia tool

Moi tool se duoc danh gia theo 6 nhom:

1. Su quan trong: nguoi dung co can dung thuong xuyen khong.
2. Su can thiet: AI co can goi tool de tra loi dung khong, hay co the tra loi tu ngon ngu tu nhien.
3. Logic nghiep vu: date range, wallet, category, budget, tinh so du, VND integer.
4. An toan du lieu: user scoping, validate input, khong ro ri du lieu user khac.
5. Do tin cay cua agent: schema ro rang, description khong mo ho, output de agent doc.
6. Tac dong frontend/sync: co can refresh state, co can dataModified, co anh huong pending mutation khong.

## Danh gia 4 tool hien tai

### 1. `get_financial_status`

Muc dich hien tai: lay tinh hinh tai chinh thang hien tai, gom vi, tong thu chi, burn rate, du bao chi tieu, ngan sach, giao dich gan day.

Danh gia so bo:

- Su quan trong: Cao. Day la tool doc du lieu nen nen giu.
- Su can thiet: Cao. Neu khong co tool, AI khong biet du lieu tai chinh that cua user.
- Logic hien tai: Tot o muc tong quan, da fetch wallet, budget, transaction thang hien tai va recent transactions.
- Rui ro:
  - Budget progress dang map toan bo budget, co the can tach active/inactive ro hon.
  - `startDate` dang lay tu dau thang nhung khong set `endDate`, nen van co the lay ca giao dich tuong lai neu co.
  - Output JSON kha lon neu user co nhieu budget.
  - Tool chi phu hop "thang hien tai", khong nen dung cho cau hoi ngay/tuan/khoang ngay.

Huong hoan thien:

- Them `endDate` la cuoi thang hien tai de range ro rang.
- Chi tra budget active truoc, inactive dua vao summary hoac gioi han so luong.
- Them cac truong `periodStart`, `periodEnd`, `currency: "VND"`.
- Lam output co cau truc on dinh: `summary`, `wallets`, `budgets`, `recentTransactions`, `insightsData`.
- Gioi han recent transactions va top categories de tiet kiem token.

### 2. `get_trend_report`

Muc dich hien tai: lay bao cao xu huong 1-6 thang gan nhat.

Danh gia so bo:

- Su quan trong: Cao. Can cho cau hoi "thang truoc", "3 thang gan day", "xu huong".
- Su can thiet: Cao. AI can du lieu lich su.
- Logic hien tai: Co tong thu, tong chi, netSaving, top categories theo thang.
- Rui ro:
  - Chi nhan `months`, chua ho tro thang/nam cu the nhu "thang 2/2026".
  - Dang tinh theo thang gan day tinh ca thang hien tai; neu user hoi "cac thang truoc" co the nen exclude current month.
  - Khong co wallet filter.
  - Khong co budget comparison.

Huong hoan thien:

- Doi schema tu `months` don gian sang linh hoat hon:
  - `months?: number`
  - `includeCurrentMonth?: boolean`
  - `startMonth?: string` dang `YYYY-MM`
  - `endMonth?: string` dang `YYYY-MM`
  - `walletId?: string`
- Neu user hoi thang cu the, agent goi tool voi `startMonth/endMonth`.
- Them `periods` co `periodStart`, `periodEnd`, `currency`.
- Them `changeVsPreviousPeriod` neu co du lieu.

### 3. `add_transaction`

Muc dich hien tai: them giao dich thu/chi tu chat.

Danh gia so bo:

- Su quan trong: Rat cao. Day la mot luong chinh cua app.
- Su can thiet: Cao neu muon AI nhap lieu nhanh.
- Logic hien tai: Goi `createTransaction`, nen backend service se update balance bang transaction.
- Rui ro:
  - Tool co side effect truc tiep nhung chua co co che xac nhan ro rang.
  - Schema cho `amount` la `z.number()` nhung chua `.int().positive()`.
  - `categoryId` la string tu do, de model chon sai id.
  - Neu khong co `walletId`, tu chon vi dau tien co the gay ghi sai vi.
  - Chua ho tro transfer.
  - `note` bat buoc, co the nen optional voi default.
  - Output la string, frontend phat hien dataModified bang text response co the khong ben vung.

Huong hoan thien:

- Doi schema:
  - `type: enum(["expense", "income"])`
  - `amount: integer positive`
  - `categoryId: enum([...category ids])` neu danh sach category co dinh
  - `walletId` optional nhung neu co nhieu vi thi nen yeu cau user noi ro hoac chon default co giai thich
  - `note` optional
  - `date` optional ISO
- Them helper resolve category/wallet tu ten tieng Viet truoc khi ghi.
- Them guardrail:
  - Khong them giao dich neu amount <= 0 hoac decimal.
  - Neu user noi mo ho "them chi an trua" ma khong co so tien thi hoi lai.
  - Neu co nhieu vi va user khong chi dinh, uu tien khong ghi ngay; hoi lai hoac dung selected/default wallet neu context co.
- Tra output structured JSON:
  - `success`
  - `transaction`
  - `dataModified: true`
  - `message`
- Cap nhat logic `dataModified` trong `chatWithAI` dua tren tool name/result, khong dua vao chuoi tieng Viet.

### 4. `scan_receipt_image`

Muc dich hien tai: quet hoa don tu anh va tra danh sach giao dich du doan.

Danh gia so bo:

- Su quan trong: Trung binh den cao. Huu ich cho nhap lieu nhanh, nhung khong phai cot loi bang add transaction.
- Su can thiet: Cao neu user gui anh hoa don.
- Logic hien tai: Goi `aiService.scanReceipt`, tra ve draft transactions.
- Rui ro:
  - Tool name co the lam agent tuong la da ghi giao dich, trong khi hien tai chi scan.
  - `dataModified` dang coi `scan_receipt_image` la thay doi du lieu, nhung tool nay khong ghi DB. Dieu nay co the lam frontend refresh khong can thiet.
  - Chua co wallet/category validation o buoc scan.
  - Chua co workflow xac nhan "luu giao dich tu hoa don".

Huong hoan thien:

- Doi ten hoac description ro hon: `extract_receipt_transactions`.
- Output structured JSON voi `draftTransactions`, `requiresConfirmation: true`.
- Khong danh dau `dataModified` neu chi scan.
- Neu muon luu tu chat, can co tool rieng `confirm_receipt_transactions` hoac dung `add_transaction` sau khi user xac nhan.
- Dam bao amount integer VND va categoryId hop le truoc khi tra draft.

## Tool nen can nhac bo sung

### A. `list_wallets`

Muc dich: cho AI biet danh sach vi, so du, ten vi, id vi.

Do uu tien: Cao.

Ly do: `add_transaction` can walletId. Neu user noi "them vao vi tien mat", agent can resolve ten vi sang id thay vi doan.

Guardrail:

- Chi tra du lieu cua user hien tai.
- Gioi han field: id, name, balance, includeInTotal.

### B. `resolve_finance_entities`

Muc dich: resolve text tu nhien sang `walletId` va `categoryId`.

Do uu tien: Cao.

Ly do: Nguoi dung se noi "an trua", "xang xe", "luong", "vi cash". Tool nay giup giam sai category/wallet.

Output:

- `matchedWallet`
- `matchedCategory`
- `confidence`
- `needsClarification`

### C. `search_transactions`

Muc dich: tim giao dich theo khoang ngay, category, wallet, type, keyword note.

Do uu tien: Cao.

Ly do: Nhieu cau hoi thuc te la "hom qua toi chi gi", "tim giao dich cafe", "thang nay an uong bao nhieu".

Schema de xuat:

- `startDate`
- `endDate`
- `type`
- `categoryId`
- `walletId`
- `keyword`
- `limit`

### D. `get_budget_status`

Muc dich: lay ngan sach va tien do theo category/wallet/period.

Do uu tien: Trung binh cao.

Ly do: Hien `get_financial_status` co budget, nhung mot tool budget rieng se tot hon cho cau hoi "ngan sach an uong con bao nhieu".

### E. `add_transfer`

Muc dich: ghi giao dich chuyen tien giua 2 vi.

Do uu tien: Trung binh.

Ly do: App co transfer UI va transaction type `transfer`, nhung AI tool hien chua support.

Guardrail:

- Can `fromWalletId`, `toWalletId`, amount integer positive.
- Khong cho from/to trung nhau.
- Can check so du neu policy app yeu cau.

### F. `create_or_update_budget`

Muc dich: tao hoac sua ngan sach.

Do uu tien: Trung binh.

Ly do: Huu ich nhung co side effect dai han, nen can confirmation ro.

Guardrail:

- Chi tao/sua khi user noi ro category, amount, period, date range.
- Amount integer VND.

## Tool khong nen them luc nay

- Tool ty gia/ngoai te trong AI agent: khong phu hop strict VND-only.
- Tool xoa giao dich bang chat: rui ro cao, de nham, nen chua uu tien.
- Tool sua so du vi truc tiep: co the lam lech du lieu so voi transaction history.
- Tool tu dong dau tu/tu van loi nhuan: vuot pham vi app hien tai.

## Thu tu uu tien implement neu duoc duyet

1. Sua `add_transaction` vi co rui ro cao nhat.
2. Sua `scan_receipt_image` thanh extract-only va dataModified dung.
3. Hoan thien `get_financial_status` voi date range/output stable.
4. Mo rong `get_trend_report` de ho tro thang cu the/range.
5. Them `list_wallets` va/hoac `resolve_finance_entities`.
6. Them `search_transactions`.
7. Can nhac `add_transfer` sau khi guardrail da on.

## Checklist truoc khi sua code

- Xac dinh tool nao co side effect va co can confirmation khong.
- Xac dinh output format structured cho moi tool.
- Kiem tra category ids khop `frontend/constants/index.ts`.
- Kiem tra serializer backend khop frontend types.
- Kiem tra `dataModified` khong dua vao string tieng Viet.
- Kiem tra query nao cung scope `userId`.
- Kiem tra amount integer VND o schema va service.

## Verification sau khi implement

- Chay backend syntax check: `npm run backend:check`.
- Chay backend lint neu can: `npm run backend:lint`.
- Chay frontend type check neu contract thay doi: `npm run frontend:check`.
- Test thu cac prompt:
  - "Thang nay toi chi bao nhieu?"
  - "Thang truoc an uong het bao nhieu?"
  - "Them chi an trua 50000 vao vi tien mat"
  - "Them thu luong 15000000"
  - "Quet hoa don nay giup toi"
  - "Chuyen 200000 tu vi tien mat sang ngan hang"

## Ket qua mong doi

- AI agent chon dung tool hon.
- Tool ghi giao dich an toan hon, it ghi sai vi/category.
- Bao cao tai chinh dung range ngay/thang hon.
- Receipt scan khong bi nham la da thay doi du lieu.
- Luong sync frontend/backend on dinh hon.
