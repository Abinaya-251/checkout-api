package main

import (
	"log"
	"net/http"
	"os"
	"strconv"
	"time"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8088"
	}

	portNumber, err := strconv.Atoi(port)
	if err != nil || portNumber < 1 || portNumber > 65535 {
		log.Fatalf("PORT must be a number between 1 and 65535; got %q", port)
	}

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           newRouter(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	log.Printf("checkout API listening on %s", server.Addr)
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("start checkout API on port %s: %v (if the port is occupied, set PORT to another available port)", port, err)
	}
}
