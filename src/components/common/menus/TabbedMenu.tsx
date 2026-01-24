import Image from 'next/image';
import { Tabs as ShadcnTabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type IconType = React.FC<React.SVGProps<SVGSVGElement>>;

interface TabProps {
  label: string;
  active: boolean;
  setPage: (page: string) => void;
  icon: IconType;
}

export const Tabs = ({ tabs, setPage }: { tabs: TabProps[]; setPage: (page: string) => void }) => {
  const activeTab =
    tabs.find(tab => tab.active)?.label.toLowerCase() || tabs[0]?.label.toLowerCase() || '';

  return (
    <div className="h-11 px-[38px]">
      <ShadcnTabs value={activeTab} onValueChange={setPage} className="w-full">
        <TabsList className="h-11 gap-[35px] bg-transparent p-0">
          {tabs.map((tab, index) => (
            <TabsTrigger
              key={index}
              value={tab.label.toLowerCase()}
              data-testid={`tab-${tab.label.toLowerCase()}`}
              className={`flex h-auto cursor-pointer items-center gap-2.5 rounded-none border-b-2 border-transparent bg-transparent px-0 py-2.5 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none`}
            >
              <tab.icon
                className={`${
                  tab.active ? 'text-foreground' : 'text-muted-foreground'
                } h-5 w-5 flex-shrink-0`}
              />
              <div
                className={`font-['Nunito Sans'] text-base font-bold ${
                  tab.active ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {tab.label}
              </div>
            </TabsTrigger>
          ))}
        </TabsList>
      </ShadcnTabs>
    </div>
  );
};
