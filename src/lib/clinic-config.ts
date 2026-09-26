// Cấu hình phòng khám.
// Tên phòng khám lấy từ biến CLINIC_NAME trong file .env (cùng chỗ với thông tin in trên đơn thuốc),
// nên đổi tên chỉ cần sửa .env rồi khởi động lại website – không phải sửa code.
// Lưu ý: tên chỉ đọc được ở phía máy chủ; trên trình duyệt giá trị này rơi về tên mặc định (không dùng ở đó).

export const clinicConfig = {
  name: process.env.CLINIC_NAME?.trim() || "Phòng khám",
  /** Múi giờ dùng để hiển thị ngày giờ, tránh lệch khi máy chủ đặt ở múi giờ khác. */
  timeZone: "Asia/Ho_Chi_Minh",
} as const;
