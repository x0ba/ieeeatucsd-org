import React from 'react';
import { Card, CardBody, CardHeader } from '@heroui/react';
import { TrendingUp } from 'lucide-react';

interface PointsChartProps {
  data: {
    date: number;
    points: number;
    cumulative: number;
  }[];
}

export default function PointsChart({ data }: PointsChartProps) {

  if (data.length < 2) {
    return null;
  }

  return (
    <Card className="w-full h-full" shadow="sm">
      <CardHeader className="flex gap-3 px-6 pt-6 pb-0">
        <div className="p-2 bg-blue-100 rounded-lg">
          <TrendingUp className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex flex-col">
          <p className="text-md font-bold text-gray-900">Points Growth</p>
          <p className="text-small text-default-500">Your activity over time</p>
        </div>
      </CardHeader>
      <CardBody className="px-4 pb-4 h-[250px]">
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Chart dependencies not installed</p>
            <p className="text-sm mt-2">Install chart.js and react-chartjs-2 to enable chart</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
