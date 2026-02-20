
export const metadata = { title: "Weather GO/NO-GO" };

export default function RootLayout({ children }) {
  return (
    <html>
      <body style={{fontFamily:"Arial", padding:20}}>{children}</body>
    </html>
  );
}
