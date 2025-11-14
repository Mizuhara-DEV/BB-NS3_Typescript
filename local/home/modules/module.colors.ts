/** module colors */
// Cung cấp bảng màu ANSI (Bitburner-compatible)
export enum Colors {
  Reset = "\x1b[0m",          // reset lại tất cả định dạng
  Bold = "\x1b[1m",           // chữ đậm
  Dim = "\x1b[2m",            // chữ mờ
  Italic = "\x1b[3m",         // chữ nghiêng
  Underline = "\x1b[4m",      // gạch chân

  // Màu cơ bản (ANSI 8-color)
  Black = "\x1b[30m",
  Red = "\x1b[31m",
  Green = "\x1b[32m",
  Yellow = "\x1b[33m",
  Blue = "\x1b[34m",
  Magenta = "\x1b[35m", // tím hồng
  Cyan = "\x1b[36m",
  White = "\x1b[37m",

  // Màu sáng (bright colors)
  BrightBlack = "\x1b[90m",
  BrightRed = "\x1b[91m",
  BrightGreen = "\x1b[92m",
  BrightYellow = "\x1b[93m",
  BrightBlue = "\x1b[94m",
  BrightMagenta = "\x1b[95m",
  BrightCyan = "\x1b[96m",
  BrightWhite = "\x1b[97m",

  // Một số màu RGB 24-bit (nếu Bitburner bản dev 3.0.0 trở lên hỗ trợ)
  Gray = "\x1b[38;2;156;163;175m",     // xám trung bình
  Orange = "\x1b[38;2;245;158;11m",    // cam
  Pink = "\x1b[38;2;236;72;153m",      // hồng
  Teal = "\x1b[38;2;6;182;212m",       // xanh ngọc
  Lime = "\x1b[38;2;132;204;22m",      // xanh lá tươi
  Violet = "\x1b[38;2;139;92;246m",    // tím
  Rose = "\x1b[38;2;251;113;133m",     // đỏ hồng
}