import React from "react";
import { Navbar } from "../components/Navbar";
import { PortfolioSections } from "../components/PortfolioSections";
import { PortfolioFooter } from "../components/PortfolioFooter";

interface PortfolioPageProps {
  reviewCount: number;
  onNavigateToDiary: () => void;
}

export const PortfolioPage: React.FC<PortfolioPageProps> = ({
  reviewCount,
  onNavigateToDiary,
}) => {
  return (
    <div className="min-h-screen bg-[#07080a] text-[#ededed] flex flex-col font-poppins selection:bg-[#ff5500] selection:text-black">
      {/* Portfolio Navigation */}
      <Navbar onNavigateToDiary={onNavigateToDiary} reviewCount={reviewCount} />

      {/* Main Portfolio Sections */}
      <main className="flex-grow">
        <PortfolioSections
          onNavigateToDiary={onNavigateToDiary}
          reviewCount={reviewCount}
        />
      </main>

      {/* Footer */}
      <PortfolioFooter onNavigateToDiary={onNavigateToDiary} />
    </div>
  );
};
