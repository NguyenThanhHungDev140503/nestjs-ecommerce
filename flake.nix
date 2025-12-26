{
  description = "NestJS E-commerce Microservices - Nx Monorepo with Nix";

  inputs = {
    # Pin nixpkgs to stable version for reproducibility
    nixpkgs.url = "github:nixos/nixpkgs/nixos-24.11";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config = {
            allowUnfree = true;
          };
        };

        # Node.js version
        nodejs = pkgs.nodejs_22;

        # ==========================================
        # SHARED CONFIGURATIONS
        # ==========================================

        # Build inputs needed for native modules
        commonBuildInputs = with pkgs; [
          nodejs
          openssl
          pkg-config
          python3 # Needed for node-gyp
        ];

        # Development tools
        devTools = with pkgs; [
          # Node.js ecosystem
          nodejs
          nodePackages.npm
          nodePackages.typescript
          nodePackages.ts-node
          nodePackages.prettier

          # Database
          postgresql_16

          # Docker
          docker-compose

          # Prisma - special handling for Nix
          prisma-engines
          openssl

          # Development utilities
          git
          jq
          curl
          wget
          ripgrep
          fd
          tree
          htop

          # Build tools
          pkg-config
          gnumake
          gcc

          # Nix tools
          alejandra # Nix formatter
          nil # Nix language server
        ];

        # Runtime libraries path
        runtimeLibs = with pkgs; [
          openssl
          stdenv.cc.cc.lib
        ];
        runtimeLibPath = pkgs.lib.makeLibraryPath runtimeLibs;

        # ==========================================
        # BUILD HELPER FUNCTION
        # ==========================================

        # Helper function to build a NestJS service
        buildNestService = name: pkgs.buildNpmPackage {
          pname = "ecommerce-${name}";
          version = "0.0.1";

          src = ./.;

          # Use importNpmLock for reproducible builds
          # This requires package-lock.json to exist
          npmDeps = pkgs.importNpmLock {
            npmRoot = ./.;
          };
          npmConfigHook = pkgs.importNpmLock.npmConfigHook;

          # Build configuration
          inherit nodejs;
          npmBuildScript = "build:${name}";

          # Install phase
          installPhase = ''
            runHook preInstall

            mkdir -p $out/lib
            cp -r dist/apps/${name}/* $out/lib/

            # Create executable wrapper
            mkdir -p $out/bin
            cat > $out/bin/${name} << 'EOF'
#!/bin/sh
export NODE_ENV=''${NODE_ENV:-production}
exec ${nodejs}/bin/node $out/lib/main.js "$@"
EOF
            chmod +x $out/bin/${name}

            runHook postInstall
          '';

          # Native dependencies
          nativeBuildInputs = [ pkgs.pkg-config ];
          buildInputs = commonBuildInputs;

          # Environment for native modules
          env = {
            PRISMA_QUERY_ENGINE_LIBRARY = "${pkgs.prisma-engines}/lib/libquery_engine.node";
            PRISMA_QUERY_ENGINE_BINARY = "${pkgs.prisma-engines}/bin/query-engine";
            PRISMA_SCHEMA_ENGINE_BINARY = "${pkgs.prisma-engines}/bin/schema-engine";
          };

          meta = {
            description = "NestJS ${name} microservice";
            mainProgram = name;
          };
        };

      in
      {
        # ==========================================
        # DEVELOPMENT SHELLS
        # ==========================================
        devShells = {
          # Main development shell
          default = pkgs.mkShell {
            name = "ecommerce-dev";

            packages = devTools;
            buildInputs = commonBuildInputs;

            env = {
              # Node.js
              NODE_ENV = "development";

              # Prisma engines
              PRISMA_QUERY_ENGINE_LIBRARY = "${pkgs.prisma-engines}/lib/libquery_engine.node";
              PRISMA_QUERY_ENGINE_BINARY = "${pkgs.prisma-engines}/bin/query-engine";
              PRISMA_SCHEMA_ENGINE_BINARY = "${pkgs.prisma-engines}/bin/schema-engine";

              # OpenSSL for Prisma and native modules
              OPENSSL_DIR = "${pkgs.openssl.dev}";
              OPENSSL_LIB_DIR = "${pkgs.openssl.out}/lib";
              OPENSSL_INCLUDE_DIR = "${pkgs.openssl.dev}/include";

              # Library path for native modules
              LD_LIBRARY_PATH = runtimeLibPath;

              # Docker
              DOCKER_BUILDKIT = "1";
              COMPOSE_DOCKER_CLI_BUILD = "1";
            };

            shellHook = ''
              echo ""
              echo "🚀 NestJS E-commerce Dev Environment"
              echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
              echo ""
              echo "📦 Versions:"
              echo "   Node.js:     $(node --version)"
              echo "   npm:         $(npm --version)"
              echo "   TypeScript:  $(tsc --version 2>/dev/null || echo 'not installed')"
              echo "   PostgreSQL:  $(psql --version 2>/dev/null | head -n1 || echo 'available')"
              echo ""

              # Check if node_modules exists
              if [ ! -d "node_modules" ]; then
                echo "📥 node_modules not found. Run: npm install"
              else
                # Try to get Nx version
                NX_VERSION=$(npx nx --version 2>/dev/null || echo "not installed")
                echo "   Nx:          $NX_VERSION"
              fi

              echo ""
              echo "💡 Quick Commands:"
              echo "   npm install           - Install dependencies"
              echo "   npx nx graph          - View dependency graph"
              echo "   npx nx serve <app>    - Serve an application"
              echo "   npx nx build <app>    - Build an application"
              echo "   npx nx affected -t test - Test affected projects"
              echo ""
              echo "🐳 Docker Commands:"
              echo "   docker-compose up -d  - Start infrastructure (RabbitMQ, PostgreSQL)"
              echo "   docker-compose down   - Stop infrastructure"
              echo ""
              echo "🔧 Nix Commands:"
              echo "   nix build .#api-gateway     - Build api-gateway"
              echo "   nix run .#api-gateway       - Run api-gateway"
              echo "   nix flake check             - Verify flake"
              echo ""

              # Set PS1 to indicate we're in the nix shell
              export PS1="\[\033[1;34m\](nix:ecommerce)\[\033[0m\] $PS1"
            '';
          };

          # Minimal CI shell
          ci = pkgs.mkShell {
            name = "ecommerce-ci";
            packages = with pkgs; [
              nodejs
              nodePackages.npm
              git
            ];

            env = {
              NODE_ENV = "ci";
              CI = "true";
            };

            shellHook = ''
              echo "CI Environment ready"
            '';
          };
        };

        # ==========================================
        # PACKAGES (nix build)
        # ==========================================
        packages = {
          # Default package
          default = self.packages.${system}.api-gateway;

          # Individual services (uncomment when package-lock.json is ready)
          # api-gateway = buildNestService "api-gateway";
          # order-management = buildNestService "order-management";
          # customer-service = buildNestService "customer-service";
          # inventory-service = buildNestService "inventory-service";
          # notification-service = buildNestService "notification-service";

          # Placeholder packages until migration is complete
          api-gateway = pkgs.writeShellScriptBin "api-gateway" ''
            echo "Build not configured yet. Please complete npm migration first."
            echo "Run: rm yarn.lock && npm install"
            exit 1
          '';

          order-management = pkgs.writeShellScriptBin "order-management" ''
            echo "Build not configured yet. Please complete npm migration first."
            exit 1
          '';

          customer-service = pkgs.writeShellScriptBin "customer-service" ''
            echo "Build not configured yet. Please complete npm migration first."
            exit 1
          '';

          inventory-service = pkgs.writeShellScriptBin "inventory-service" ''
            echo "Build not configured yet. Please complete npm migration first."
            exit 1
          '';

          notification-service = pkgs.writeShellScriptBin "notification-service" ''
            echo "Build not configured yet. Please complete npm migration first."
            exit 1
          '';

          # Build all services
          all = pkgs.symlinkJoin {
            name = "ecommerce-all";
            paths = [
              self.packages.${system}.api-gateway
              self.packages.${system}.order-management
              self.packages.${system}.customer-service
              self.packages.${system}.inventory-service
              self.packages.${system}.notification-service
            ];
          };
        };

        # ==========================================
        # APPS (nix run)
        # ==========================================
        apps = {
          default = self.apps.${system}.api-gateway;

          api-gateway = {
            type = "app";
            program = "${self.packages.${system}.api-gateway}/bin/api-gateway";
            meta.description = "Run API Gateway service";
          };

          order-management = {
            type = "app";
            program = "${self.packages.${system}.order-management}/bin/order-management";
            meta.description = "Run Order Management service";
          };

          customer-service = {
            type = "app";
            program = "${self.packages.${system}.customer-service}/bin/customer-service";
            meta.description = "Run Customer Service";
          };

          inventory-service = {
            type = "app";
            program = "${self.packages.${system}.inventory-service}/bin/inventory-service";
            meta.description = "Run Inventory Service";
          };

          notification-service = {
            type = "app";
            program = "${self.packages.${system}.notification-service}/bin/notification-service";
            meta.description = "Run Notification Service";
          };

          # Development helper: Start all services
          dev = {
            type = "app";
            program = toString (pkgs.writeShellScript "dev-all" ''
              echo "Starting all services in development mode..."
              cd ${self}
              ${nodejs}/bin/npx nx run-many -t serve
            '');
            meta.description = "Start all services in development mode";
          };

          # Open Nx dependency graph
          graph = {
            type = "app";
            program = toString (pkgs.writeShellScript "nx-graph" ''
              cd ${self}
              ${nodejs}/bin/npx nx graph
            '');
            meta.description = "Open Nx dependency graph";
          };

          # Docker compose up
          infra-up = {
            type = "app";
            program = toString (pkgs.writeShellScript "infra-up" ''
              cd ${self}
              ${pkgs.docker-compose}/bin/docker-compose up -d
              echo "Infrastructure started. Services:"
              ${pkgs.docker-compose}/bin/docker-compose ps
            '');
            meta.description = "Start infrastructure (RabbitMQ, PostgreSQL)";
          };

          # Docker compose down
          infra-down = {
            type = "app";
            program = toString (pkgs.writeShellScript "infra-down" ''
              cd ${self}
              ${pkgs.docker-compose}/bin/docker-compose down
              echo "Infrastructure stopped."
            '');
            meta.description = "Stop infrastructure";
          };
        };

        # ==========================================
        # FORMATTER
        # ==========================================
        formatter = pkgs.alejandra;

        # ==========================================
        # CHECKS (nix flake check)
        # ==========================================
        checks = {
          # Format check for Nix files
          nixFormat = pkgs.runCommand "nix-format-check" {
            buildInputs = [ pkgs.alejandra ];
          } ''
            alejandra --check ${self}/flake.nix
            touch $out
          '';
        };
      }
    );
}
