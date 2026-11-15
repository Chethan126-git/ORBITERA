import { useOrbitera } from '../../context/OrbiteraContext';

export function useChartTheme() {
  const { settings } = useOrbitera();
  const isDark = settings.theme === 'dark';

  return {
    isDark,
    gridStroke: isDark ? '#1E2B48' : '#E4EAF2',
    tickFill: isDark ? '#94A3B8' : '#667085',
    tooltipStyle: {
      borderRadius: '8px',
      borderColor: isDark ? '#1E2B48' : '#E4EAF2',
      backgroundColor: isDark ? '#0B1224' : '#FFFFFF',
      color: isDark ? '#F1F5F9' : '#101828',
      fontSize: '12px',
    },
    legendStyle: {
      fontSize: '12px',
      color: isDark ? '#CBD5E1' : '#475467',
    },
  };
}
