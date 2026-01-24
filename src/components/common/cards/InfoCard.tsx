import Image from 'next/image';
import { StaticImageData } from 'next/image';
interface InfoCardProps {
  data: {
    title: string;
    value: string;
    percentage: string;
    subtitle: string;
    // change mainIcon to Image type
    mainIcon: StaticImageData;
  };
}
export const InfoCard = ({ data }: InfoCardProps) => {
  return (
    <div className="relative h-[161px] w-[262px]">
      {/* Card Background */}
      <div className="absolute h-full w-full rounded-[14px] border border-border bg-card" />

      {/* Percentage and Subtitle */}
      <div className="absolute bottom-4 left-4 h-6 w-[210px]">
        <div className="absolute flex items-center gap-2">
          <span className="font-['Nunito Sans'] text-base font-semibold text-primary">
            {data.percentage}
          </span>
          <span className="font-['Nunito Sans'] text-base font-semibold text-card-foreground">
            {data.subtitle}
          </span>
        </div>
      </div>

      {/* Icons */}
      <div className="absolute right-4 top-4 h-[60px] w-[60px]">
        <Image
          src={data.mainIcon}
          alt="Main Icon"
          width={60}
          height={60}
          className="rounded-[14px]"
        />

        <div className="absolute left-[14px] top-[18px] h-6 w-8"></div>
      </div>

      {/* Title */}
      <div className="font-['Nunito Sans'] absolute left-4 top-4 text-base font-semibold text-muted-foreground">
        {data.title}
      </div>

      {/* Value */}
      <div className="font-['Nunito Sans'] absolute left-4 top-[54px] text-[28px] font-bold tracking-wide text-card-foreground">
        {data.value}
      </div>
    </div>
  );
};
