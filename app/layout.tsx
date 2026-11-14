import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Service Library — AWS Simulator',description:'Choose an AWS service to explore in an interactive learning sandbox.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
