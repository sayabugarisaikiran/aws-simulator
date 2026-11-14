import { ArrowRight, Box, ChevronRight, Cloud, Home, Layers, Network, Plus, Route } from 'lucide-react';
import './service-library.css';

export default function ServiceLibrary() {
  return (
    <div className="service-library">
      <aside className="library-sidebar" aria-label="Service sidebar">
        <div className="library-brand">
          <span className="library-mark"><Network size={19} aria-hidden="true" /></span>
          <span>AWS Simulator</span>
        </div>
        <nav aria-label="Services">
          <a href="/" className="library-nav-item" aria-current="page">
            <Home size={17} aria-hidden="true" /> Home
          </a>
          <p className="library-nav-heading">Networking</p>
          <a href="/vpc" className="library-nav-item">
            <Box size={17} aria-hidden="true" /> VPC
          </a>
        </nav>
      </aside>
      <main className="library-main">
        <div className="library-titlebar" aria-hidden="true">Home</div>
        <div className="library-content">
          <h1>Service Library</h1>
          <section className="library-feature" aria-labelledby="featured-service">
            <div className="library-feature-copy">
              <h2 id="featured-service">Virtual Private Cloud</h2>
              <p>Build a network and trace traffic through subnets and gateways.</p>
              <a href="/vpc" className="library-launch">
                Open VPC Simulator <ChevronRight size={17} aria-hidden="true" />
              </a>
            </div>
            <div className="library-feature-icon" aria-hidden="true"><Network strokeWidth={1.35} /></div>
          </section>

          <section className="library-shelf" aria-labelledby="vpc-workspaces">
            <h2 id="vpc-workspaces">VPC Workspaces</h2>
            <div className="library-cards">
              <a className="library-card" href="/vpc?workspace=example">
                <div className="library-card-art library-example-art" aria-hidden="true">
                  <span className="library-preview-network">
                    <span className="library-preview-gateway"><Cloud size={24} /></span>
                    <span className="library-preview-route"><Route size={23} /></span>
                    <span className="library-preview-subnet"><Layers size={23} /></span>
                  </span>
                </div>
                <span className="library-card-title">Example network <ArrowRight size={16} aria-hidden="true" /></span>
                <span className="library-card-caption">Explore a preconfigured VPC and trace a packet.</span>
              </a>
              <a className="library-card" href="/vpc?workspace=custom">
                <div className="library-card-art library-workspace-art" aria-hidden="true">
                  <span className="library-preview-add"><Plus size={30} /></span>
                </div>
                <span className="library-card-title">My workspace <ArrowRight size={16} aria-hidden="true" /></span>
                <span className="library-card-caption">Build a VPC or pick up where you left off.</span>
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
