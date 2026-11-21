from openpyxl import load_workbook

workbook = load_workbook(
    "/Users/roshanxavier/lululemon/learning/Keystone_Estimate_v4.xlsx"
)

worksheet = workbook.active

worksheet.delete_cols(1)

workbook.save(
    "/Users/roshanxavier/lululemon/learning/Keystone_Estimate_v4_modified.xlsx"
)

print("Column A deleted successfully.")