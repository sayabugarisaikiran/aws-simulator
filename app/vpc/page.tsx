import type { Metadata } from 'next';
import VpcWorkspace from './workspace';

export const metadata: Metadata = {
  title: 'VPC Lab — AWS Simulator',
  description: 'Build a VPC, configure your network, and follow a packet through the simulator.',
};

export default function VpcPage() {
  return <VpcWorkspace />;
}
