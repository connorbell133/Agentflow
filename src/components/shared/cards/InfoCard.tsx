import Image from "next/image";
import { StaticImageData } from "next/image";
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
    <div className="w-[262px] h-[161px] relative">
      {/* Card Background */}
      <div className="absolute w-full h-full bg-card rounded-[14px] border border-border" />

      {/* Percentage and Subtitle */}
      <div className="absolute left-4 bottom-4 w-[210px] h-6">
        <div className="absolute flex items-center gap-2">
          <span className="text-primary text-base font-semibold font-['Nunito Sans']">
            {data.percentage}
          </span>
          <span className="text-card-foreground text-base font-semibold font-['Nunito Sans']">
            {data.subtitle}
          </span>
        </div>
      </div>

      {/* Icons */}
      <div className="absolute w-[60px] h-[60px] top-4 right-4">
        <Image
          src={data.mainIcon}
          alt="Main Icon"
          width={60}
          height={60}
          className="rounded-[14px]"
        />

        <div className="absolute w-8 h-6 top-[18px] left-[14px]"></div>
      </div>

      {/* Title */}
      <div className="absolute left-4 top-4 text-muted-foreground text-base font-semibold font-['Nunito Sans']">
        {data.title}
      </div>

      {/* Value */}
      <div className="absolute left-4 top-[54px] text-card-foreground text-[28px] font-bold font-['Nunito Sans'] tracking-wide">
        {data.value}
      </div>
    </div>
  );
};
