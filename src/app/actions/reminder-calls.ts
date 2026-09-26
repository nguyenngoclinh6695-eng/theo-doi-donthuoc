"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/data";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ghi nhận nhân viên đã gọi nhắc bệnh nhân trễ hẹn; lượt gọi và nhật ký được ghi cùng một giao dịch. */
export async function recordReminderCall(appointmentId: string): Promise<void> {
  // Server action có thể bị gọi thẳng từ ngoài giao diện, nên luôn kiểm tra lại dữ liệu đầu vào.
  if (typeof appointmentId !== "string" || !UUID_RE.test(appointmentId)) {
    throw new Error("Mã lịch hẹn không hợp lệ.");
  }
  const user = await getCurrentUser();
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, patientId: true },
  });
  if (!appointment) throw new Error("Không tìm thấy lịch hẹn.");

  await prisma.$transaction(async (tx) => {
    const call = await tx.reminderCall.create({
      data: { patientId: appointment.patientId, appointmentId: appointment.id, calledById: user.id },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "reminder_call.create",
        entityType: "ReminderCall",
        entityId: call.id,
        details: { appointmentId: appointment.id, patientId: appointment.patientId },
      },
    });
  });

  revalidatePath("/");
}
