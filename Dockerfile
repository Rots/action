FROM node

RUN apt update && apt install -y lsb-release \
	&& wget http://mirrors.kernel.org/ubuntu/pool/main/p/protobuf/libprotobuf9v5_2.6.1-1.3_amd64.deb \
	&& dpkg -i libprotobuf9v5_2.6.1-1.3_amd64.deb \
	&& echo "deb http://download.rethinkdb.com/apt `lsb_release -cs` main" | tee /etc/apt/sources.list.d/rethinkdb.list \
	&& wget -qO- https://download.rethinkdb.com/apt/pubkey.gpg | apt-key add - \
	&& apt update && apt install -y \
		rethinkdb \
 && npm install -g yarn  babel-plugin-module-resolver

COPY . /app

WORKDIR /app

RUN cp .env.example .env

CMD ["./startup.sh"]
