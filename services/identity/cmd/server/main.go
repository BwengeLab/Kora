package main

import "github.com/kora-finance/kora/libs/servicekit"

func main() {
	if err := servicekit.ListenAndServe("identity"); err != nil {
		panic(err)
	}
}

