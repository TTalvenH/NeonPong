import * as THREE from 'three'
import { initEventListener } from './Init/initEventListener.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PlayerEntity } from './entities/PlayerEntity.js';
import { PlaneEntity } from './entities/PlaneEntity.js';
import { NeonBoxEntity } from './entities/NeonBoxEntity.js';
import { initRenderer } from './Init/initRenderer.js';
import { initScene } from './Init/initScene.js';
import { initPostProcessing } from './Init/initPostProcessing.js';
import { BallEntity } from './entities/BallEntity.js';
import { collisionSystem } from './collisionSystem.js';
import { HealthBarEntity } from './entities/HealthBarEntity.js';
import { CameraEntity } from './entities/CameraEntity.js';
import { TextEntity } from './entities/TextEntity.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';

import * as COLORS from './colors.js';

export const	GameStates = Object.freeze({
	PAUSED: 0,
	PLAYING: 1,
	GAMEOVER: 2,
	MENU: 3,
	LOADING: 4,
});

export class Pong
{
	constructor() {
		this.gameGlobals = { gameState: GameStates.LOADING };

		const loadingManager = new THREE.LoadingManager();
		const loader = new FontLoader(loadingManager);
		loader.load('/fonts/jersey10-regular.json', (font) => {
			this.font = font;
		});
		
		loadingManager.onLoad = () => {
			this.gameInit();
			this.gameGlobals.gameState = GameStates.MENU;
		};
		this.gameLoop();
	}

	gameInit() {
		this.entities = {};
		this.scene = initScene();
		this.entities['Camera'] = new CameraEntity(this.gameGlobals);
		this.camera = this.entities['Camera'].camera;
		this.renderer = initRenderer();
		this.composer = initPostProcessing(this.scene, this.camera, this.renderer);
		this.controls = new OrbitControls( this.camera, this.renderer.domElement );
		
		this.entities['Player1'] = new PlayerEntity(new THREE.Vector3(4, 0, 0), COLORS.FOLLY);
		this.entities['Player1Health'] = new HealthBarEntity(new THREE.Vector3(5, 5.5, 0), this.entities["Player1"]);
		this.entities['Player2'] = new PlayerEntity(new THREE.Vector3(-4, 0, 0), COLORS.SKYBLUE);
		this.entities['Player2Health'] = new HealthBarEntity(new THREE.Vector3(-5, 5.5, 0), this.entities["Player2"]);
		this.entities['NeonBox1'] = new NeonBoxEntity(new THREE.Vector3(0, -3, 0), 9.9, 0.1, 0.04, false, COLORS.INDIGO);
		this.entities['NeonBox2'] = new NeonBoxEntity(new THREE.Vector3(0, 3, 0), 9.9, 0.1, 0.04, false, COLORS.INDIGO);
		this.entities['NeonBox3'] = new NeonBoxEntity(new THREE.Vector3(-5, 0, 0), 0.1, 6.1, 0.04, true, COLORS.SKYBLUE);
		this.entities['NeonBox4'] = new NeonBoxEntity(new THREE.Vector3(5, 0, 0), 0.1, 6.1, 0.04, true, COLORS.FOLLY);
		this.entities['Ball'] = new BallEntity();
		this.entities['Plane'] = new PlaneEntity(new THREE.Vector3(0, 0, -0.25), window.innerWidth, window.innerHeight);
		this.entities['User1Name'] = new TextEntity("Guest1", new THREE.Vector3(6, 7.7, 0), this.font, COLORS.INDIGO);
		this.entities['User2Name'] = new TextEntity("Guest2", new THREE.Vector3(-6, 7.7, 0), this.font, COLORS.INDIGO);
		this.entities['CountDown'] = new TextEntity("", new THREE.Vector3(0, 0, 3), this.font, COLORS.INDIGO, this.camera);
		this.entities['WinnerName'] = new TextEntity("", new THREE.Vector3(0, 0, 3), this.font, COLORS.INDIGO, this.camera);

		for (const key in this.entities) {
			if (this.entities.hasOwnProperty(key))
			{
				const entity = this.entities[key];
				entity.render(this.scene);
			}
		}

		
		this.gameClock = new THREE.Clock();
		this.clock = new THREE.Clock();
		this.clockDelta = new THREE.Clock();
		this.interval = 1 / 120;
		this.isWinnerLoopOn = false;
		this.winner = "";
		initEventListener(this.entities, this.gameGlobals);
	}

	async startCountDown() {
		const countDown = this.entities['CountDown'];
		const camera = this.entities['Camera'];
		let i = 3;
		camera.setTargetLookAt(countDown.position);
		while (i >= 0) {
			countDown.setText(i.toString());
			await new Promise(resolve => setTimeout(resolve, 1000));
			i--;
		}
		camera.setTargetLookAt(new THREE.Vector3(0, 0, 0));
		countDown.setText("");
		this.gameGlobals.gameState = i === -1 ? GameStates.PLAYING : GameStates.MENU;
	}

	async winnerLoop() {
		const winnerName = this.entities['WinnerName'];
		const camera = this.entities['Camera'];

		this.isWinnerLoopOn = true;
		winnerName.setText(this.winner);
		camera.setTargetLookAt(winnerName.position);
		await new Promise(resolve => setTimeout(resolve, 5000));
		camera.setTargetLookAt(new THREE.Vector3(0, 0, 0));
		this.isWinnerLoopOn = false;
	}

	startGame(userData) {
		const user1Name = this.entities['User1Name']
		const user2Name = this.entities['User2Name']

		// user1Name.setText(userData.user.username);
		// console.log(userData);
		this.startCountDown();
	}

	resetGame(deltaTime) {
		const player1 = this.entities["Player1"];
		const player2 = this.entities["Player2"];
		const ball = this.entities["Ball"];
		const camera = this.entities['Camera'];
		const winnerName = this.entities['WinnerName'];

		if (this.isWinnerLoopOn){
			return;
		}

		camera.targetFov = 180;
		if (Math.abs(this.camera.fov - camera.targetFov) > 0.1) {
			return;
		}

		winnerName.setText("");
		player1.position.copy(player1.initPosition);
		player1.hitPoints = player1.initHitPoints;
		player2.position.copy(player2.initPosition);
		player2.hitPoints = player2.initHitPoints;
		ball.position.copy(ball.initPosition);
		ball.speed = ball.initSpeed;
		ball.trail.forEach(trailMesh => {
			trailMesh.position.set(0, 0, 0);
		});

		for (const key in this.entities) {
			if (this.entities.hasOwnProperty(key)) {
				const entity = this.entities[key];
				entity.update(deltaTime);
			}
		}
		camera.targetFov = 75;
		this.gameGlobals.gameState = GameStates.MENU;
	}

	checkGameOver() {
		const player1 = this.entities["Player1"];
		const player2 = this.entities["Player2"];
		const userName1 = this.entities["User1Name"];
		const userName2 = this.entities["User2Name"];
		const goal1 = this.entities["NeonBox3"];
		const goal2 = this.entities["NeonBox4"];

		if (player1.hitPoints <= 0) {
			console.log("Player2 WINS!");
			this.winner = "Winner is " + userName2.text + " !";
		} else if (player2.hitPoints <= 0) {
			console.log("Player1 WINS!");
			this.winner = "Winner is " + userName1.text + " !";
		} else {
			return;
		}

		goal1.material.emissiveIntensity = 1;
		goal2.material.emissiveIntensity = 1;
		this.winnerLoop();
		this.gameGlobals.gameState = GameStates.GAMEOVER;
	}

	gameLoop() {
		requestAnimationFrame(() => this.gameLoop());
		if ( this.gameGlobals.gameState === GameStates.LOADING || this.clock.getElapsedTime() < this.interval) {
			return;
		}
		this.clock.start(); 
		const deltaTime = this.clockDelta.getDelta() * 100;
		this.composer.render(this.scene, this.camera);
		switch (this.gameGlobals.gameState) {
			case GameStates.PAUSED:
				return;
			case GameStates.PLAYING:
				collisionSystem(this.entities, deltaTime);
				this.checkGameOver()
				for (const key in this.entities) {
					if (this.entities.hasOwnProperty(key)) {
						const entity = this.entities[key];
						entity.update(deltaTime);
					}
				}
				break;
			case GameStates.MENU:
				break;
			case GameStates.GAMEOVER:
				this.resetGame(deltaTime);
				break;
		}
		this.entities['Camera'].update(deltaTime);
		this.entities['CountDown'].update(deltaTime);
		this.entities['WinnerName'].update(deltaTime);
		const { width, height } = this.renderer.getSize(new THREE.Vector2());
		if (width !== window.innerWidth || height !== window.innerHeight) {
			this.entities['Camera'].camera.aspect = window.innerWidth / window.innerHeight;
			this.entities['Camera'].camera.updateProjectionMatrix();
			this.renderer.setSize(window.innerWidth, window.innerHeight);
		}
	}
}
