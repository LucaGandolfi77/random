"""Demo for Data Scientist Agent - Advanced analytics."""

from ctrl_fabric.agents import DataScientistAgent


def main():
    # Create agent
    ds_agent = DataScientistAgent()
    
    # Sample data
    sales_data = [
        {"category": "t-shirts", "amount": 29.99},
        {"category": "hoodies", "amount": 59.99},
        {"category": "t-shirts", "amount": 29.99},
        {"category": "pants", "amount": 49.99},
        {"category": "t-shirts", "amount": 29.99},
        {"category": "jackets", "amount": 89.99},
    ]
    
    customer_data = [
        {"total_spent": 150, "segment": "trend_focused"},
        {"total_spent": 450, "segment": "value"},
        {"total_spent": 750, "segment": "premium"},
        {"total_spent": 120, "segment": "trend_focused"},
        {"total_spent": 280, "segment": "value"},
    ]
    
    # Run analytics
    print("=== Advanced Analytics ===")
    result = ds_agent.run(sales_data, customer_data)
    
    print(f"\n--- Trend Prediction ---")
    print(f"Top trend: {result['trends']['top_trend']}")
    print(f"Confidence: {result['trends']['confidence'] * 100}%")
    print(f"Predictions: {result['trends']['predicted_categories']}")
    
    print(f"\n--- Customer Segmentation ---")
    for seg, data in result['segments'].items():
        print(f"{seg}: {data['count']} customers, avg spend ${data['avg_spend']}")
    
    print(f"\n--- Price Optimization ---")
    for cat, data in result['price_optimization'].items():
        print(f"{cat}: ${data['base_price']} → ${data['optimized_price']} ({data['change_percent']:+.1f}%)")
    
    print(f"\n--- Recommendation ---")
    print(result['recommendation'])


if __name__ == "__main__":
    main()