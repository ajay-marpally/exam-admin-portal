import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardHeader } from '../ui/Card';

interface HeatmapData {
    name: string;
    value: number;
    severity: 'low' | 'medium' | 'high';
    children?: HeatmapData[];
    [key: string]: unknown;
}

interface RiskHeatmapProps {
    data: HeatmapData[];
    title?: string;
    isLoading?: boolean;
}

const COLORS = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#ef4444',
};

interface TreemapContentProps {
    x: number;
    y: number;
    width: number;
    height: number;
    name: string;
    value: number;
    severity: 'low' | 'medium' | 'high';
}

const CustomContent = ({ x, y, width, height, name, value, severity }: TreemapContentProps) => {
    if (width < 50 || height < 30) return null;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={COLORS[severity] || COLORS.low}
                stroke="#fff"
                strokeWidth={2}
                rx={4}
                className="transition-opacity duration-200 hover:opacity-80"
            />
            <text
                x={x + width / 2}
                y={y + height / 2 - 8}
                textAnchor="middle"
                fill="#fff"
                fontSize={12}
                fontWeight={600}
            >
                {name}
            </text>
            <text
                x={x + width / 2}
                y={y + height / 2 + 10}
                textAnchor="middle"
                fill="#fff"
                fontSize={14}
                fontWeight={700}
            >
                {value}
            </text>
        </g>
    );
};

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ payload: HeatmapData }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (!active || !payload?.[0]) return null;

    const data = payload[0].payload;
    return (
        <div className="bg-surface-800 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
            <p className="font-medium">{data.name}</p>
            <p className="text-surface-300">Alerts: {data.value}</p>
            <p className="text-surface-300 capitalize">Risk: {data.severity}</p>
        </div>
    );
};

export function RiskHeatmap({ data, title = 'Risk Distribution', isLoading }: RiskHeatmapProps) {
    if (isLoading) {
        return (
            <Card padding="md">
                <CardHeader title={title} />
                <div className="h-64 animate-pulse bg-surface-100 dark:bg-surface-700 rounded-lg" />
            </Card>
        );
    }

    if (!data.length) {
        return (
            <Card padding="md">
                <CardHeader title={title} />
                <div className="h-64 flex items-center justify-center text-surface-500 dark:text-surface-400">
                    No data available
                </div>
            </Card>
        );
    }

    return (
        <Card padding="md">
            <CardHeader title={title} />
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                        data={data as any}
                        dataKey="value"
                        aspectRatio={4 / 3}
                        stroke="#fff"
                        content={<CustomContent x={0} y={0} width={0} height={0} name="" value={0} severity="low" />}
                    >
                        <Tooltip content={<CustomTooltip />} />
                    </Treemap>
                </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4">
                {Object.entries(COLORS).map(([key, color]) => (
                    <div key={key} className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: color }}
                        />
                        <span className="text-xs text-surface-600 dark:text-surface-400 capitalize">
                            {key} Risk
                        </span>
                    </div>
                ))}
            </div>
        </Card>
    );
}
