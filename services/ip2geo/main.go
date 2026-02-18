package main

import (
	"context"
	"fmt"
	"net"
	"os"

	pb "github.com/wintkhantlin/url2short-ip2geo/gen"
	"github.com/wintkhantlin/url2short-ip2geo/geoip"
	"google.golang.org/grpc"
)

type server struct {
	pb.UnimplementedIp2GeoServiceServer
}

func (s *server) Lookup(ctx context.Context, req *pb.IpRequest) (*pb.GeoResponse, error) {
	country, state := geoip.Lookup(req.Ip)

	return &pb.GeoResponse{Country: country, State: state}, nil
}

func main() {
	geoip.Init("./db/GeoLite2-City.mmdb")

	port, is_port_env_ok := os.LookupEnv("PORT")

	if !is_port_env_ok {
		port = "50050"
	}

	listener, err := net.Listen("tcp", fmt.Sprintf(":%s", port))

	if err != nil {
		panic(err)
	}

	grpc_server := grpc.NewServer()
	pb.RegisterIp2GeoServiceServer(grpc_server, &server{})

	fmt.Printf("Ip2Geo GRPC Running on port :%s \n", port)

	grpc_server.Serve(listener)
}
