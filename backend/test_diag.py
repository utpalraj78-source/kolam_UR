from kolam_generator import generate_kolam

cases = ["diagonal", "diagonal up", "diagonal down", "square", "random"]
for sym in cases:
    try:
        M, allRows, allCols, segments, img_b64, png = generate_kolam(sym, 4, 5, seed=1, analyze=True, return_preview=False)
        print(f"SYM={sym}")
        print("M shape:", M.shape)
        print("allRows len:", len(allRows), "row len:", len(allRows[0]) if allRows else None)
        print("allCols len:", len(allCols), "col len:", len(allCols[0]) if allCols else None)
        # print a small excerpt
        print("M[0]:", M[0].tolist())
        print("----")
    except Exception as e:
        print(f"Error for {sym}: {e}")
