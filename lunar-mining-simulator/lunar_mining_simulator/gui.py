import tkinter as tk
from tkinter import ttk, messagebox
from .simulation import SimulationEngine
from .models.regolith import LunarLocation
import matplotlib
matplotlib.use('TkAgg')
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import matplotlib.pyplot as plt


class LunarMiningGUI:
    """Graphical interface for lunar mining simulation."""
    
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Lunar Mining & Mars Colonization Simulator")
        self.root.geometry("1000x700")
        
        self.engine: SimulationEngine = None
        self.results = None
        
        self.setup_ui()
    
    def setup_ui(self):
        # Control panel
        control_frame = ttk.LabelFrame(self.root, text="Simulation Controls")
        control_frame.pack(fill="x", padx=10, pady=5)
        
        ttk.Label(control_frame, text="Years:").grid(row=0, column=0, padx=5)
        self.years_var = tk.IntVar(value=30)
        ttk.Entry(control_frame, textvariable=self.years_var, width=10).grid(row=0, column=1, padx=5)
        
        ttk.Label(control_frame, text="Robots:").grid(row=0, column=2, padx=5)
        self.robots_var = tk.IntVar(value=10)
        ttk.Entry(control_frame, textvariable=self.robots_var, width=10).grid(row=0, column=3, padx=5)
        
        ttk.Label(control_frame, text="Location:").grid(row=0, column=4, padx=5)
        self.location_var = tk.StringVar(value="lunar_pole")
        location_cb = ttk.Combobox(
            control_frame, 
            textvariable=self.location_var,
            values=["lunar_pole", "lunar_equator", "lunar_mare", "lunar_highland"],
            width=15
        )
        location_cb.grid(row=0, column=5, padx=5)
        
        ttk.Button(control_frame, text="Run Simulation", command=self.run_simulation).grid(
            row=0, column=6, padx=10
        )
        
        # Results panel
        results_frame = ttk.LabelFrame(self.root, text="Results")
        results_frame.pack(fill="both", expand=True, padx=10, pady=5)
        
        self.notebook = ttk.Notebook(results_frame)
        self.notebook.pack(fill="both", expand=True)
        
        # Summary tab
        summary_frame = ttk.Frame(self.notebook)
        self.notebook.add(summary_frame, text="Summary")
        
        self.summary_text = tk.Text(summary_frame, wrap="word")
        self.summary_text.pack(fill="both", expand=True, padx=5, pady=5)
        
        # Chart tab
        chart_frame = ttk.Frame(self.notebook)
        self.notebook.add(chart_frame, text="Material Growth")
        
        self.fig, self.ax = plt.subplots(figsize=(8, 4))
        self.canvas = FigureCanvasTkAgg(self.fig, master=chart_frame)
        self.canvas.get_tk_widget().pack(fill="both", expand=True)
    
    def run_simulation(self):
        try:
            years = self.years_var.get()
            robots = self.robots_var.get()
            location = LunarLocation(self.location_var.get())
            
            self.engine = SimulationEngine(location=location, initial_robots=robots, years=years)
            self.results = self.engine.run_simulation()
            
            self.update_summary()
            self.update_chart()
            
        except Exception as e:
            messagebox.showerror("Error", str(e))
    
    def update_summary(self):
        self.summary_text.delete("1.0", tk.END)
        
        if not self.results:
            return
        
        summary = f"""
LUNAR MINING SIMULATION RESULTS
==============================

Total Regolith Processed: {self.results['total_regolith_processed']:.2f} tons

Robot Population:
  Initial: {self.results['final_robot_count']}
  Replication Potential: {self.results['replication_potential']}

Materials Extracted (kg):
"""
        for mat, amount in self.results['total_materials'].items():
            summary += f"  {mat}: {amount:.2f}\n"
        
        summary += f"""
Energy System:
  Total Power: {self.results['energy_stats']['total_power_kw']:.2f} kW
  Solar Panels: {self.results['energy_stats']['solar_count']}
  Nuclear Reactors: {self.results['energy_stats']['nuclear_count']}

Monte Carlo Statistics (tons):
  Mean: {self.results['monte_carlo']['mean_tons']:.2f}
  95% CI: [{self.results['monte_carlo']['ci_lower']:.2f}, {self.results['monte_carlo']['ci_upper']:.2f}]

Colonization Milestones:
"""
        for milestone, count in self.results['colonization_milestones'].items():
            summary += f"  {milestone}: {count} robots\n"
        
        self.summary_text.insert("1.0", summary)
    
    def update_chart(self):
        self.ax.clear()
        
        if not self.results:
            return
        
        material_data = self.results.get('material_projection', {})
        days = list(material_data.get('day', []))
        
        for mat in ['iron_kg', 'aluminum_kg', 'silicon_kg', 'oxygen_kg']:
            if mat in material_data:
                self.ax.plot(days, material_data[mat], label=mat.replace('_kg', ''))
        
        self.ax.set_xlabel('Days')
        self.ax.set_ylabel('Kilograms')
        self.ax.set_title('Material Accumulation Over Time')
        self.ax.legend()
        self.ax.grid(True, alpha=0.3)
        
        self.canvas.draw()


def main():
    root = tk.Tk()
    app = LunarMiningGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()