import './globals.css';

export const metadata = {
  title: 'Party App',
  description: 'Live party scoreboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
