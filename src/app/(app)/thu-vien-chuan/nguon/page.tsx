import type { Metadata } from "next";
import { createSource } from "@/app/actions/standards";
import { LibraryHeader } from "@/components/standards/library-tabs";
import { QuickCreateForm } from "@/components/standards/quick-create-form";
import { FormField } from "@/components/ui/form-field";
import { SectionCard } from "@/components/ui/section-card";
import { can } from "@/domain/permissions";
import { requirePermission } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";
import { listSources } from "@/lib/standards";

export const metadata: Metadata = { title: "Văn bản nguồn – Thư viện chuẩn" };

export default async function SourcesPage() {
  const user = await requirePermission("standards.view");
  const sources = await listSources();

  return (
    <div className="space-y-6">
      <LibraryHeader current="/thu-vien-chuan/nguon" />

      {can(user.role, "standards.manage") && (
        <SectionCard id="them-nguon" title="Thêm văn bản nguồn" description="Quyết định, hướng dẫn chẩn đoán và điều trị, phác đồ… làm căn cứ cho bộ ngưỡng.">
          <div className="p-5">
            <QuickCreateForm action={createSource} submitLabel="Thêm văn bản">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FormField id="title" name="title" label="Tên văn bản" required maxLength={300} />
                </div>
                <FormField id="documentNumber" name="documentNumber" label="Số hiệu" optional maxLength={100} />
                <FormField id="issuer" name="issuer" label="Cơ quan ban hành" optional maxLength={200} />
                <FormField id="issuedDate" name="issuedDate" type="date" label="Ngày ban hành" optional />
                <FormField id="url" name="url" type="url" label="Đường dẫn tới văn bản" optional maxLength={500} />
              </div>
            </QuickCreateForm>
          </div>
        </SectionCard>
      )}

      <SectionCard id="ds-nguon" title="Danh sách văn bản" description={`${sources.length} văn bản`}>
        {sources.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-muted">Chưa có văn bản nguồn.</p>
        ) : (
          <ul className="divide-y divide-line">
            {sources.map((s) => (
              <li key={s.id} className="px-5 py-3 text-sm">
                <p className="font-medium">{s.title}</p>
                <p className="text-ink-muted">
                  {[s.documentNumber, s.issuer, s.issuedDate && `ban hành ${formatDate(s.issuedDate.toISOString())}`].filter(Boolean).join(" · ") || "Chưa ghi số hiệu/cơ quan"}
                  {" · "}
                  {s._count.sets} bộ ngưỡng · thêm bởi {s.createdBy.fullName}
                </p>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary-ink underline-offset-4 hover:underline">
                    Mở văn bản
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
