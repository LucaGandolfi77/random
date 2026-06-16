import matplotlib.pyplot as plt
import pandas as pd
from typing import Dict, Optional


def plot_material_growth(material_projection: Dict, save_path: Optional[str] = None):
    """Plot material accumulation curves."""
    df = pd.DataFrame(material_projection)
    
    fig, ax = plt.subplots(figsize=(12, 6))
    
    materials = ['iron_kg', 'aluminum_kg', 'silicon_kg', 'oxygen_kg', 'titanium_kg']
    colors = ['#c0392b', '#3498db', '#f39c12', '#27ae60', '#9b59b6']
    
    for mat, color in zip(materials, colors):
        if mat in df.columns:
            ax.plot(df['day'], df[mat], label=mat.replace('_kg', '').title(), color=color, linewidth=2)
    
    ax.set_xlabel('Days of Operation', fontsize=12)
    ax.set_ylabel('Kilograms Extracted', fontsize=12)
    ax.set_title('Lunar Mining: Material Accumulation Over Time', fontsize=14, fontweight='bold')
    ax.legend(loc='upper left')
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
    
    return fig


def plot_population_growth(population_projection: Dict, save_path: Optional[str] = None):
    """Plot robot population growth."""
    df = pd.DataFrame(population_projection)
    
    fig, ax = plt.subplots(figsize=(10, 5))
    
    ax.plot(df['day'], df['robots'], color='#e74c3c', linewidth=2)
    ax.fill_between(df['day'], df['robots'], alpha=0.3, color='#e74c3c')
    
    ax.set_xlabel('Days', fontsize=12)
    ax.set_ylabel('Robot Count', fontsize=12)
    ax.set_title('Self-Replication: Robot Population Growth', fontsize=14, fontweight='bold')
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
    
    return fig


def plot_energy_consumption(energy_data: Dict, save_path: Optional[str] = None):
    """Plot energy system performance."""
    fig, ax = plt.subplots(figsize=(8, 5))
    
    categories = ['Solar', 'Nuclear']
    values = [
        energy_data.get('solar_count', 0) * 20,  # Approximate kW per panel
        energy_data.get('nuclear_count', 0) * 300,  # kW per reactor
    ]
    
    ax.bar(categories, values, color=['#f1c40f', '#34495e'])
    ax.set_ylabel('Power (kW)')
    ax.set_title('Energy System Capacity')
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
    
    return fig


def generate_full_report(results: Dict, output_dir: str = "./output"):
    """Generate complete visualization report."""
    import os
    os.makedirs(output_dir, exist_ok=True)
    
    if 'material_projection' in results:
        fig1 = plot_material_growth(results['material_projection'])
        fig1.savefig(f"{output_dir}/material_growth.png", dpi=150)
        plt.close(fig1)
    
    if 'population_projection' in results:
        fig2 = plot_population_growth(results['population_projection'])
        fig2.savefig(f"{output_dir}/population_growth.png", dpi=150)
        plt.close(fig2)
    
    if 'energy_stats' in results:
        fig3 = plot_energy_consumption(results['energy_stats'])
        fig3.savefig(f"{output_dir}/energy_system.png", dpi=150)
        plt.close(fig3)
    
    return f"Report generated in {output_dir}"