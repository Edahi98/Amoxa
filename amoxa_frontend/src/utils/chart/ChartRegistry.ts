import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PieController,
  PointElement,
  RadarController,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';

export class ChartRegistry {
  private static registered = false;

  public static ensure(): void {
    if (ChartRegistry.registered) {
      return;
    }
    ChartJS.register(
      ArcElement,
      BarElement,
      LineElement,
      PointElement,
      BarController,
      LineController,
      PieController,
      DoughnutController,
      RadarController,
      CategoryScale,
      LinearScale,
      RadialLinearScale,
      Filler,
      Legend,
      Tooltip,
    );
    ChartRegistry.registered = true;
  }
}
