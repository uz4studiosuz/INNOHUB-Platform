import sys
sys.path.insert(0, 'engine')

from electronics.ohms_law import calculate_voltage
result1 = calculate_voltage(2, 10)
print(f"Ohm qonuni natijasi: {result1} (kutilgan: 20)")

from aerodynamics.lift_drag import lift_force
result2 = lift_force(1.225, 20, 10, 0.5)
print(f"Ko'tarish kuchi natijasi: {result2}")