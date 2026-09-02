# Property schema

Fields: property_id, model_id, model_version, input_lower/input_upper (dims match model), 
output_constraint {relation: lt/le/gt/ge/ne, value}, method, timeout_s, tolerance. Validation rejects
missing fields, dimension mismatch and lower>upper.
