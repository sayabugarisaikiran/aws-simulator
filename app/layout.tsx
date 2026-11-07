import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'VPC Lab — AWS Simulator',description:'Build a single VPC, configure your network, and follow a packet through an interactive learning sandbox.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
